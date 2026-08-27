from __future__ import annotations

import asyncio
import inspect
import threading
import time
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

import pytest

from api.app.media.storage import (
    MediaStorageConfigurationError,
    MediaStorageError,
    MediaStorageTimeout,
    MediaValidationError,
    R2Storage,
    StorageOwnershipError,
    UploadOwner,
)


PNG = b"\x89PNG\r\n\x1a\n" + b"quantgym-image"
JPEG = b"\xff\xd8\xff\xe0" + b"quantgym-image"
PDF = b"%PDF-1.7\n%quantgym"


class SecretValue:
    def __init__(self, value: str) -> None:
        self._value = value

    def get_secret_value(self) -> str:
        return self._value

    def __repr__(self) -> str:  # pragma: no cover - catches accidental repr use
        raise AssertionError("secret wrappers must never be repr'd")


@dataclass(frozen=True)
class Settings:
    r2_endpoint: str = (
        "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com"
    )
    r2_access_key_id: str | SecretValue = "preview-access-key"
    r2_secret_access_key: str | SecretValue = "preview-secret-key"
    r2_bucket: str = "quantgym-v2-preview-media"
    r2_max_bytes: int = 1024
    r2_timeout_seconds: float = 0.25
    r2_workers: int = 2


class FakeR2Client:
    def __init__(self) -> None:
        self.put_calls: list[dict[str, Any]] = []
        self.delete_calls: list[dict[str, Any]] = []
        self.put_error: Exception | None = None
        self.delete_error: Exception | None = None
        self.put_started: threading.Event | None = None
        self.put_release: threading.Event | None = None
        self.delay_seconds = 0.0
        self.put_delays: list[float] = []
        self.delete_delay_seconds = 0.0
        self.active = 0
        self.max_active = 0
        self._lock = threading.Lock()

    def put_object(self, **kwargs: Any) -> dict[str, str]:
        with self._lock:
            self.active += 1
            self.max_active = max(self.max_active, self.active)
            call_index = len(self.put_calls)
            self.put_calls.append(kwargs)

        try:
            if self.put_started is not None:
                self.put_started.set()
            if self.put_release is not None:
                self.put_release.wait(timeout=2)
            delay_seconds = (
                self.put_delays[call_index]
                if call_index < len(self.put_delays)
                else self.delay_seconds
            )
            if delay_seconds:
                time.sleep(delay_seconds)
            if self.put_error is not None:
                raise self.put_error
            return {"ETag": '"safe-etag"'}
        finally:
            with self._lock:
                self.active -= 1

    def delete_object(self, **kwargs: Any) -> dict[str, Any]:
        self.delete_calls.append(kwargs)
        if self.delete_delay_seconds:
            time.sleep(self.delete_delay_seconds)
        if self.delete_error is not None:
            raise self.delete_error
        return {}


class ClientHarness:
    def __init__(self, client: FakeR2Client) -> None:
        self.client = client
        self.client_calls: list[tuple[str, dict[str, Any]]] = []
        self.config_calls: list[dict[str, Any]] = []

    def config_factory(self, **kwargs: Any) -> dict[str, Any]:
        self.config_calls.append(kwargs)
        return {"kind": "botocore-config", **kwargs}

    def client_factory(self, service_name: str, **kwargs: Any) -> FakeR2Client:
        self.client_calls.append((service_name, kwargs))
        return self.client


def make_storage(
    client: FakeR2Client | None = None,
    *,
    settings: Settings | None = None,
    max_bytes: int = 1024,
    timeout: float = 0.25,
    max_workers: int = 2,
) -> tuple[R2Storage, FakeR2Client, ClientHarness]:
    resolved_client = client or FakeR2Client()
    harness = ClientHarness(resolved_client)
    storage = R2Storage(
        settings or Settings(),
        max_bytes=max_bytes,
        operation_timeout_seconds=timeout,
        max_workers=max_workers,
        client_factory=harness.client_factory,
        config_factory=harness.config_factory,
    )
    return storage, resolved_client, harness


def run(coroutine: Any) -> Any:
    return asyncio.run(coroutine)


def test_client_is_private_sigv4_r2_in_auto_region_and_unwraps_secrets() -> None:
    settings = Settings(
        r2_access_key_id=SecretValue("wrapped-access-key"),
        r2_secret_access_key=SecretValue("wrapped-secret-key"),
    )
    storage, _, harness = make_storage(settings=settings)

    assert harness.config_calls == [
        {
            "signature_version": "s3v4",
            "connect_timeout": 0.25,
            "read_timeout": 0.25,
            "retries": {"max_attempts": 2, "mode": "standard"},
        }
    ]
    assert harness.client_calls == [
        (
            "s3",
            {
                "endpoint_url": settings.r2_endpoint,
                "aws_access_key_id": "wrapped-access-key",
                "aws_secret_access_key": "wrapped-secret-key",
                "region_name": "auto",
                "config": harness.config_calls[0] | {"kind": "botocore-config"},
            },
        )
    ]

    run(storage.aclose())


def test_limits_default_to_settings_values_without_main_app_adapter_code() -> None:
    settings = Settings(r2_max_bytes=8, r2_timeout_seconds=0.125, r2_workers=1)
    client = FakeR2Client()
    harness = ClientHarness(client)
    storage = R2Storage(
        settings,
        client_factory=harness.client_factory,
        config_factory=harness.config_factory,
    )

    assert harness.config_calls[0]["connect_timeout"] == 0.125
    assert harness.config_calls[0]["read_timeout"] == 0.125

    async def scenario() -> None:
        with pytest.raises(MediaValidationError, match="media size is invalid"):
            await storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("phase1-seed"),
            )
        assert client.put_calls == []
        await storage.aclose()

    run(scenario())


@pytest.mark.parametrize(
    "endpoint",
    [
        "http://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
        "https://user:pass@0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
        "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com:443",
        "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/path",
        "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com?token=secret",
        "https://objects.example.com",
    ],
)
def test_storage_rejects_non_cloudflare_or_credential_bearing_endpoints(
    endpoint: str,
) -> None:
    client = FakeR2Client()
    harness = ClientHarness(client)
    with pytest.raises(
        MediaStorageConfigurationError,
        match="media storage configuration is invalid",
    ):
        R2Storage(
            Settings(r2_endpoint=endpoint),
            client_factory=harness.client_factory,
            config_factory=harness.config_factory,
        )

    assert harness.client_calls == []


def test_storage_rejects_every_bucket_except_the_isolated_preview_bucket() -> None:
    client = FakeR2Client()
    harness = ClientHarness(client)
    sensitive_bucket = "production-customer-attachments"

    with pytest.raises(
        MediaStorageConfigurationError,
        match="media storage configuration is invalid",
    ) as raised:
        R2Storage(
            Settings(r2_bucket=sensitive_bucket),
            client_factory=harness.client_factory,
            config_factory=harness.config_factory,
        )

    assert harness.client_calls == []
    assert sensitive_bucket not in f"{raised.value!s} {raised.value!r}"
    assert raised.value.__cause__ is None
    assert raised.value.__context__ is None


def test_upload_uses_server_owned_unpredictable_user_keys_and_never_sets_acl() -> None:
    storage, client, _ = make_storage()
    owner = UploadOwner.user(UUID("2dca7c1f-cafe-4fad-8626-f8d7750e3789"))

    async def scenario() -> None:
        first = await storage.upload(PNG, declared_content_type="image/png", owner=owner)
        second = await storage.upload(PNG, declared_content_type="image/png", owner=owner)

        assert first.key.startswith(f"users/{owner.identifier}/")
        assert first.key.endswith(".png")
        assert second.key != first.key
        assert first.byte_size == len(PNG)
        assert first.content_type == "image/png"
        assert first.etag == "safe-etag"
        assert first.bucket == "quantgym-v2-preview-media"

        for call in client.put_calls:
            assert call["Bucket"] == "quantgym-v2-preview-media"
            assert call["Body"] == PNG
            assert call["ContentType"] == "image/png"
            assert "ACL" not in call
            assert "GrantRead" not in call

        await storage.aclose()

    run(scenario())


@pytest.mark.parametrize(
    "identifier",
    ["../guest", "Guest", "guest/other", "guest..other", "-guest", "guest-", "", "a" * 65],
)
def test_synthetic_owner_rejects_unsafe_or_noncanonical_identifiers(identifier: str) -> None:
    with pytest.raises(StorageOwnershipError, match="upload owner is invalid"):
        UploadOwner.synthetic(identifier)


def test_upload_requires_exactly_one_valid_server_scope() -> None:
    with pytest.raises(StorageOwnershipError, match="upload owner is invalid"):
        UploadOwner(kind="user", identifier="not-a-uuid")

    with pytest.raises(StorageOwnershipError, match="upload owner is invalid"):
        UploadOwner(kind="guest", identifier="visitor")


def test_synthetic_upload_is_scoped_and_cross_owner_delete_is_rejected() -> None:
    storage, client, _ = make_storage()

    async def scenario() -> None:
        owner = UploadOwner.synthetic("phase1-seed")
        stored = await storage.upload(PDF, declared_content_type="application/pdf", owner=owner)
        assert stored.key.startswith("synthetic/phase1-seed/")
        assert stored.key.endswith(".pdf")

        with pytest.raises(StorageOwnershipError, match="object is outside the owner scope"):
            await storage.delete(stored.key, owner=UploadOwner.synthetic("other-seed"))

        assert client.delete_calls == []
        await storage.delete(stored.key, owner=owner)
        assert client.delete_calls == [
            {"Bucket": "quantgym-v2-preview-media", "Key": stored.key}
        ]
        await storage.aclose()

    run(scenario())


@pytest.mark.parametrize(
    ("payload", "declared_content_type"),
    [
        (b"", "image/png"),
        (b"not-an-image", "image/png"),
        (JPEG, "image/png"),
        (PNG, "application/octet-stream"),
        (b"PK\x03\x04archive", "application/zip"),
        (PNG, "image/png; charset=binary"),
    ],
)
def test_upload_rejects_empty_undetected_mismatched_or_disallowed_media(
    payload: bytes, declared_content_type: str
) -> None:
    storage, client, _ = make_storage()

    async def scenario() -> None:
        with pytest.raises(MediaValidationError):
            await storage.upload(
                payload,
                declared_content_type=declared_content_type,
                owner=UploadOwner.synthetic("phase1-seed"),
            )
        assert client.put_calls == []
        await storage.aclose()

    run(scenario())


def test_upload_rejects_payload_over_configured_byte_limit_before_sdk_work() -> None:
    storage, client, _ = make_storage(max_bytes=len(PNG) - 1)

    async def scenario() -> None:
        with pytest.raises(MediaValidationError, match="media size is invalid"):
            await storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("phase1-seed"),
            )
        assert client.put_calls == []
        await storage.aclose()

    run(scenario())


def test_blocking_sdk_calls_run_on_a_bounded_worker_pool() -> None:
    client = FakeR2Client()
    client.delay_seconds = 0.04
    storage, _, _ = make_storage(client, max_workers=2, timeout=1)

    async def scenario() -> None:
        await asyncio.gather(
            *(
                storage.upload(
                    PNG,
                    declared_content_type="image/png",
                    owner=UploadOwner.synthetic(f"seed-{index}"),
                )
                for index in range(6)
            )
        )
        assert client.max_active == 2
        await storage.aclose()

    run(scenario())


def test_waiting_for_a_saturated_worker_slot_obeys_the_operation_timeout() -> None:
    client = FakeR2Client()
    client.put_started = threading.Event()
    client.put_release = threading.Event()
    storage, _, _ = make_storage(client, max_workers=1, timeout=0.02)

    async def scenario() -> None:
        first = asyncio.create_task(
            storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("seed-first"),
            )
        )
        await asyncio.to_thread(client.put_started.wait, 1)

        with pytest.raises(MediaStorageTimeout, match="media storage timed out"):
            await asyncio.wait_for(
                storage.upload(
                    PNG,
                    declared_content_type="image/png",
                    owner=UploadOwner.synthetic("seed-second"),
                ),
                timeout=0.2,
            )

        assert len(client.put_calls) == 1
        client.put_release.set()
        with pytest.raises(MediaStorageTimeout):
            await first
        await storage.wait_for_cleanup()
        await storage.aclose()

    run(scenario())


def test_upload_queue_and_sdk_wait_share_one_monotonic_deadline() -> None:
    client = FakeR2Client()
    client.put_started = threading.Event()
    client.put_delays = [0.08, 0.22]
    storage, _, _ = make_storage(client, max_workers=1, timeout=0.25)

    async def scenario() -> None:
        first = asyncio.create_task(
            storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("deadline-first"),
            )
        )
        await asyncio.to_thread(client.put_started.wait, 1)
        second = asyncio.create_task(
            storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("deadline-second"),
            )
        )

        await first
        with pytest.raises(MediaStorageTimeout, match="media storage timed out"):
            await second

        await storage.wait_for_cleanup()
        assert len(client.put_calls) == 2
        assert client.delete_calls[0]["Key"] == client.put_calls[1]["Key"]
        await storage.aclose()

    run(scenario())


def test_delete_queue_and_sdk_wait_share_one_monotonic_deadline() -> None:
    client = FakeR2Client()
    client.put_delays = [0.0, 0.08]
    client.delete_delay_seconds = 0.22
    storage, _, _ = make_storage(client, max_workers=1, timeout=0.25)

    async def scenario() -> None:
        owner = UploadOwner.synthetic("delete-deadline")
        stored = await storage.upload(
            PNG,
            declared_content_type="image/png",
            owner=owner,
        )
        client.put_started = threading.Event()
        blocker = asyncio.create_task(
            storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("delete-blocker"),
            )
        )
        await asyncio.to_thread(client.put_started.wait, 1)
        deleting = asyncio.create_task(storage.delete(stored.key, owner=owner))

        await blocker
        with pytest.raises(MediaStorageTimeout, match="media storage timed out"):
            await deleting

        await storage.aclose()

    run(scenario())


def test_timeout_returns_sanitized_error_then_cleans_late_partial_object() -> None:
    client = FakeR2Client()
    client.delay_seconds = 0.06
    storage, _, _ = make_storage(client, timeout=0.01)

    async def scenario() -> None:
        with pytest.raises(MediaStorageTimeout, match="media storage timed out") as raised:
            await storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("phase1-seed"),
            )

        assert "preview" not in str(raised.value)
        await storage.wait_for_cleanup()
        assert len(client.delete_calls) == 1
        assert client.delete_calls[0]["Key"] == client.put_calls[0]["Key"]
        await storage.aclose()

    run(scenario())


def test_cancellation_is_prompt_and_schedules_cleanup_after_sdk_call_settles() -> None:
    client = FakeR2Client()
    client.put_started = threading.Event()
    client.put_release = threading.Event()
    storage, _, _ = make_storage(client, timeout=1)

    async def scenario() -> None:
        task = asyncio.create_task(
            storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("phase1-seed"),
            )
        )
        await asyncio.to_thread(client.put_started.wait, 1)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

        client.put_release.set()
        await storage.wait_for_cleanup()
        assert len(client.delete_calls) == 1
        assert client.delete_calls[0]["Key"] == client.put_calls[0]["Key"]
        await storage.aclose()

    run(scenario())


def test_close_waits_for_cancelled_active_upload_to_register_cleanup() -> None:
    client = FakeR2Client()
    client.put_started = threading.Event()
    client.put_release = threading.Event()
    storage, _, _ = make_storage(client, timeout=1)

    async def scenario() -> None:
        upload = asyncio.create_task(
            storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("close-upload-race"),
            )
        )
        assert await asyncio.to_thread(client.put_started.wait, 1)

        loop = asyncio.get_running_loop()
        original_run_in_executor = loop.run_in_executor
        shutdown_requested = asyncio.Event()

        def observed_run_in_executor(
            executor: Any, operation: Any, *args: Any
        ) -> asyncio.Future[Any]:
            if executor is None:
                shutdown_requested.set()
            return original_run_in_executor(executor, operation, *args)

        original_close = storage._close
        close_body_started = asyncio.Event()

        async def observed_close() -> None:
            close_body_started.set()
            await original_close()

        setattr(loop, "run_in_executor", observed_run_in_executor)
        storage._close = observed_close  # type: ignore[method-assign]
        closing: asyncio.Task[None] | None = None
        try:
            closing = asyncio.create_task(storage.aclose())
            await close_body_started.wait()

            # The close body has run to its first suspension. It must be waiting for the active
            # upload, not requesting executor shutdown while that upload can still add cleanup.
            assert storage._closed is True
            assert closing.done() is False
            assert shutdown_requested.is_set() is False

            upload.cancel()
            with pytest.raises(asyncio.CancelledError):
                await upload
            assert len(storage._cleanup_tasks) == 1
            assert shutdown_requested.is_set() is False

            client.put_release.set()
            await closing

            assert shutdown_requested.is_set() is True
            assert storage._executor._shutdown is True
            assert client.delete_calls == [
                {
                    "Bucket": "quantgym-v2-preview-media",
                    "Key": client.put_calls[0]["Key"],
                }
            ]
        finally:
            client.put_release.set()
            if not upload.done():
                upload.cancel()
            await asyncio.gather(upload, return_exceptions=True)
            if closing is not None:
                await asyncio.gather(closing, return_exceptions=True)
            setattr(loop, "run_in_executor", original_run_in_executor)
            if not storage._executor._shutdown:
                await storage.aclose()

    run(scenario())


def test_cancelled_close_continues_internally_and_retry_waits_for_shutdown() -> None:
    client = FakeR2Client()
    client.put_started = threading.Event()
    client.put_release = threading.Event()
    storage, _, _ = make_storage(client, timeout=0.01)

    async def scenario() -> None:
        upload = asyncio.create_task(
            storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("close-cancel"),
            )
        )
        await asyncio.to_thread(client.put_started.wait, 1)
        with pytest.raises(MediaStorageTimeout):
            await upload

        closing = asyncio.create_task(storage.aclose())
        await asyncio.sleep(0)
        closing.cancel()
        with pytest.raises(asyncio.CancelledError):
            await closing

        client.put_release.set()
        await storage.aclose()

        try:
            assert storage._executor._shutdown is True
        finally:
            if not storage._executor._shutdown:
                storage._executor.shutdown(wait=True, cancel_futures=False)

        with pytest.raises(MediaStorageError, match="media storage is closed"):
            await storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("closed-storage"),
            )

    run(scenario())


def test_sdk_failure_attempts_cleanup_and_never_exposes_provider_secrets() -> None:
    client = FakeR2Client()
    sensitive = (
        "preview-access-key preview-secret-key "
        "https://user:pass@preview.r2.dev/private?X-Amz-Signature=secret "
        "internal-object-name"
    )
    client.put_error = RuntimeError(sensitive)
    client.delete_error = RuntimeError(sensitive)
    storage, _, _ = make_storage(client)

    async def scenario() -> None:
        with pytest.raises(MediaStorageError, match="media storage request failed") as raised:
            await storage.upload(
                PNG,
                declared_content_type="image/png",
                owner=UploadOwner.synthetic("phase1-seed"),
            )

        rendered = f"{raised.value!s} {raised.value!r}"
        for secret_fragment in (
            "preview-access-key",
            "preview-secret-key",
            "X-Amz-Signature",
            "internal-object-name",
        ):
            assert secret_fragment not in rendered
        assert raised.value.__cause__ is None
        assert raised.value.__context__ is None
        assert len(client.delete_calls) == 1
        await storage.aclose()

    run(scenario())


def test_client_construction_failure_drops_secret_bearing_exception_context() -> None:
    sensitive = "preview-access-key preview-secret-key X-Amz-Signature=secret"

    def fail_client_factory(_service_name: str, **_kwargs: Any) -> FakeR2Client:
        raise RuntimeError(sensitive)

    with pytest.raises(
        MediaStorageConfigurationError,
        match="media storage configuration is invalid",
    ) as raised:
        R2Storage(
            Settings(),
            client_factory=fail_client_factory,
            config_factory=lambda **kwargs: kwargs,
        )

    assert sensitive not in f"{raised.value!s} {raised.value!r}"
    assert raised.value.__cause__ is None
    assert raised.value.__context__ is None


def test_public_upload_api_has_no_caller_controlled_object_key_or_acl_parameters() -> None:
    parameters = inspect.signature(R2Storage.upload).parameters
    assert "object_key" not in parameters
    assert "key" not in parameters
    assert "acl" not in parameters
    assert "public" not in parameters
