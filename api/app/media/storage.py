"""Private Cloudflare R2 media storage.

The boundary intentionally exposes no caller-controlled object keys, ACLs, or signed URLs.
Blocking boto3 operations run in a small, owned worker pool so async request handlers remain
responsive.
"""

from __future__ import annotations

import asyncio
import math
import re
import secrets
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import partial
from typing import Any, Callable, Mapping, Protocol
from urllib.parse import urlsplit
from uuid import UUID


DEFAULT_MAX_BYTES = 10 * 1024 * 1024
DEFAULT_OPERATION_TIMEOUT_SECONDS = 15.0
DEFAULT_MAX_WORKERS = 4
PREVIEW_R2_BUCKET = "quantgym-v2-preview-media"
_MAX_WORKERS_LIMIT = 32

_SYNTHETIC_ID_PATTERN = re.compile(
    r"^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$"
)
_R2_HOST_PATTERN = re.compile(r"^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$")
_GENERATED_NAME_PATTERN = re.compile(
    r"^[0-9a-f]{48}\.(?:png|jpg|webp|gif|pdf)$"
)


class SecretLike(Protocol):
    """The subset of Pydantic SecretStr used by the storage boundary."""

    def get_secret_value(self) -> str: ...


class StorageSettings(Protocol):
    """Minimal settings contract, compatible with Pydantic Settings or a data class."""

    r2_endpoint: str
    r2_access_key_id: str | SecretLike
    r2_secret_access_key: str | SecretLike
    r2_bucket: str
    r2_max_bytes: int
    r2_timeout_seconds: float
    r2_workers: int


class MediaStorageError(RuntimeError):
    """A provider-safe media storage failure."""

    code = "MEDIA_STORAGE_FAILED"


class MediaStorageTimeout(MediaStorageError):
    """The R2 request exceeded the configured deadline."""

    code = "MEDIA_STORAGE_TIMEOUT"


class MediaValidationError(MediaStorageError, ValueError):
    """The provided media bytes or declared type are invalid."""

    code = "MEDIA_INVALID"


class StorageOwnershipError(MediaValidationError):
    """The requested operation is outside its server-issued owner scope."""

    code = "MEDIA_OWNER_INVALID"


class MediaStorageConfigurationError(MediaStorageError):
    """R2 settings are missing or unsafe."""

    code = "MEDIA_STORAGE_CONFIGURATION_INVALID"


@dataclass(frozen=True, slots=True)
class UploadOwner:
    """A server-established R2 namespace.

    Application routes must derive this value from the authenticated session or from a trusted
    synthetic seed job. It is never accepted as an arbitrary object-key prefix from a guest.
    """

    kind: str
    identifier: str

    def __post_init__(self) -> None:
        valid = False
        if self.kind == "user":
            try:
                valid = str(UUID(self.identifier)) == self.identifier
            except (ValueError, AttributeError, TypeError):
                valid = False
        elif self.kind == "synthetic":
            valid = _SYNTHETIC_ID_PATTERN.fullmatch(self.identifier) is not None

        if not valid:
            raise StorageOwnershipError("upload owner is invalid") from None

    @classmethod
    def user(cls, user_id: UUID | str) -> UploadOwner:
        try:
            canonical_id = str(UUID(str(user_id)))
        except (ValueError, AttributeError, TypeError):
            raise StorageOwnershipError("upload owner is invalid") from None
        return cls(kind="user", identifier=canonical_id)

    @classmethod
    def synthetic(cls, identifier: str) -> UploadOwner:
        return cls(kind="synthetic", identifier=identifier)

    @property
    def prefix(self) -> str:
        directory = "users" if self.kind == "user" else "synthetic"
        return f"{directory}/{self.identifier}/"


@dataclass(frozen=True, slots=True)
class StoredObject:
    """Non-secret metadata returned after a successful private upload."""

    bucket: str
    key: str
    content_type: str
    byte_size: int
    etag: str | None


@dataclass(frozen=True, slots=True)
class _MediaType:
    extension: str
    matches: Callable[[bytes], bool]


_MEDIA_TYPES: dict[str, _MediaType] = {
    "image/png": _MediaType("png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/jpeg": _MediaType("jpg", lambda data: data.startswith(b"\xff\xd8\xff")),
    "image/webp": _MediaType(
        "webp",
        lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    ),
    "image/gif": _MediaType(
        "gif", lambda data: data.startswith((b"GIF87a", b"GIF89a"))
    ),
    "application/pdf": _MediaType("pdf", lambda data: data.startswith(b"%PDF-")),
}


ClientFactory = Callable[..., Any]
ConfigFactory = Callable[..., Any]


class R2Storage:
    """Async-safe, private R2 object storage with server-owned namespaces."""

    def __init__(
        self,
        settings: StorageSettings,
        *,
        max_bytes: int | None = None,
        operation_timeout_seconds: float | None = None,
        max_workers: int | None = None,
        client_factory: ClientFactory | None = None,
        config_factory: ConfigFactory | None = None,
    ) -> None:
        resolved_max_bytes = (
            _read_optional_setting(settings, "r2_max_bytes", DEFAULT_MAX_BYTES)
            if max_bytes is None
            else max_bytes
        )
        resolved_timeout = (
            _read_optional_setting(
                settings, "r2_timeout_seconds", DEFAULT_OPERATION_TIMEOUT_SECONDS
            )
            if operation_timeout_seconds is None
            else operation_timeout_seconds
        )
        resolved_workers = (
            _read_optional_setting(settings, "r2_workers", DEFAULT_MAX_WORKERS)
            if max_workers is None
            else max_workers
        )
        self._max_bytes = _validate_positive_int(
            resolved_max_bytes, "media size limit is invalid"
        )
        self._operation_timeout_seconds = _validate_timeout(resolved_timeout)
        self._max_workers = _validate_worker_count(resolved_workers)

        endpoint = _validate_endpoint(_read_setting(settings, "r2_endpoint"))
        bucket = _validate_bucket(_read_setting(settings, "r2_bucket"))
        access_key_id = _read_secret_setting(settings, "r2_access_key_id")
        secret_access_key = _read_secret_setting(settings, "r2_secret_access_key")

        resolved_client_factory, resolved_config_factory = _resolve_factories(
            client_factory, config_factory
        )
        configuration_failed = False
        client: Any = None
        try:
            boto_config = resolved_config_factory(
                signature_version="s3v4",
                connect_timeout=self._operation_timeout_seconds,
                read_timeout=self._operation_timeout_seconds,
                retries={"max_attempts": 2, "mode": "standard"},
            )
            client = resolved_client_factory(
                "s3",
                endpoint_url=endpoint,
                aws_access_key_id=access_key_id,
                aws_secret_access_key=secret_access_key,
                region_name="auto",
                config=boto_config,
            )
        except Exception:
            configuration_failed = True

        if configuration_failed or client is None:
            raise MediaStorageConfigurationError(
                "media storage configuration is invalid"
            ) from None

        self._client = client
        self._bucket = bucket
        self._executor = ThreadPoolExecutor(
            max_workers=self._max_workers, thread_name_prefix="quantgym-r2"
        )
        self._slots = asyncio.Semaphore(self._max_workers)
        self._cleanup_tasks: set[asyncio.Task[None]] = set()
        self._active_operations = 0
        self._active_operations_drained = asyncio.Event()
        self._active_operations_drained.set()
        self._closed = False
        self._close_task: asyncio.Task[None] | None = None

    async def upload(
        self,
        payload: bytes | bytearray | memoryview,
        *,
        declared_content_type: str,
        owner: UploadOwner,
    ) -> StoredObject:
        """Validate and privately upload bytes under a server-owned object key."""

        self._begin_public_operation()
        try:
            return await self._upload(
                payload,
                declared_content_type=declared_content_type,
                owner=owner,
            )
        finally:
            self._end_public_operation()

    async def _upload(
        self,
        payload: bytes | bytearray | memoryview,
        *,
        declared_content_type: str,
        owner: UploadOwner,
    ) -> StoredObject:
        validated_owner = _require_owner(owner)
        media_bytes = _validate_bytes(payload, self._max_bytes)
        media_type = _validate_media_type(media_bytes, declared_content_type)
        object_key = (
            f"{validated_owner.prefix}{secrets.token_hex(24)}.{media_type.extension}"
        )
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self._operation_timeout_seconds

        upload_future = await self._submit_sdk(
            self._client.put_object,
            deadline=deadline,
            Bucket=self._bucket,
            Key=object_key,
            Body=media_bytes,
            ContentType=declared_content_type,
        )
        remaining = deadline - loop.time()
        if remaining <= 0:
            self._schedule_cleanup(object_key, after=upload_future)
            raise MediaStorageTimeout("media storage timed out") from None

        provider_failed = False
        try:
            response = await asyncio.wait_for(
                asyncio.shield(upload_future), timeout=remaining
            )
        except asyncio.TimeoutError:
            self._schedule_cleanup(object_key, after=upload_future)
            raise MediaStorageTimeout("media storage timed out") from None
        except asyncio.CancelledError:
            self._schedule_cleanup(object_key, after=upload_future)
            raise
        except Exception:
            provider_failed = True

        if provider_failed:
            cleanup = self._schedule_cleanup(object_key)
            try:
                await asyncio.shield(cleanup)
            except asyncio.CancelledError:
                raise
            raise MediaStorageError("media storage request failed") from None

        etag = _safe_etag(response)
        return StoredObject(
            bucket=self._bucket,
            key=object_key,
            content_type=declared_content_type,
            byte_size=len(media_bytes),
            etag=etag,
        )

    async def delete(self, object_key: str, *, owner: UploadOwner) -> None:
        """Delete only an object generated within the supplied trusted owner namespace."""

        self._begin_public_operation()
        try:
            await self._delete(object_key, owner=owner)
        finally:
            self._end_public_operation()

    async def _delete(self, object_key: str, *, owner: UploadOwner) -> None:
        validated_owner = _require_owner(owner)
        _validate_owned_key(object_key, validated_owner)
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self._operation_timeout_seconds
        future = await self._submit_sdk(
            self._client.delete_object,
            deadline=deadline,
            Bucket=self._bucket,
            Key=object_key,
        )
        timed_out = False
        provider_failed = False
        remaining = deadline - loop.time()
        if remaining <= 0:
            timed_out = True
        else:
            try:
                await asyncio.wait_for(asyncio.shield(future), timeout=remaining)
            except asyncio.TimeoutError:
                timed_out = True
            except asyncio.CancelledError:
                raise
            except Exception:
                provider_failed = True

        if timed_out:
            raise MediaStorageTimeout("media storage timed out") from None
        if provider_failed:
            raise MediaStorageError("media storage request failed") from None

    async def wait_for_cleanup(self) -> None:
        """Wait for all late-upload and best-effort cleanup work scheduled so far."""

        while self._cleanup_tasks:
            pending = tuple(self._cleanup_tasks)
            await asyncio.gather(
                *(asyncio.shield(task) for task in pending), return_exceptions=True
            )

    async def aclose(self) -> None:
        """Stop admission, drain active operations and cleanup, then stop workers."""

        if self._close_task is None:
            self._closed = True
            self._close_task = asyncio.create_task(self._close())
        await asyncio.shield(self._close_task)

    async def __aenter__(self) -> R2Storage:
        self._ensure_open()
        return self

    async def __aexit__(self, *_exc_info: object) -> None:
        await self.aclose()

    async def _submit_sdk(
        self,
        operation: Callable[..., Any],
        *,
        deadline: float,
        **kwargs: Any,
    ) -> asyncio.Future[Any]:
        loop = asyncio.get_running_loop()
        remaining = deadline - loop.time()
        if remaining <= 0:
            raise MediaStorageTimeout("media storage timed out") from None

        slot_timed_out = False
        try:
            await asyncio.wait_for(self._slots.acquire(), timeout=remaining)
        except asyncio.TimeoutError:
            slot_timed_out = True

        if slot_timed_out:
            raise MediaStorageTimeout("media storage timed out") from None

        if loop.time() >= deadline:
            self._slots.release()
            raise MediaStorageTimeout("media storage timed out") from None

        try:
            future = loop.run_in_executor(self._executor, partial(operation, **kwargs))
        except BaseException:
            self._slots.release()
            raise

        future.add_done_callback(lambda _future: self._slots.release())
        return future

    def _schedule_cleanup(
        self, object_key: str, *, after: asyncio.Future[Any] | None = None
    ) -> asyncio.Task[None]:
        cleanup = asyncio.create_task(self._cleanup_object(object_key, after=after))
        self._cleanup_tasks.add(cleanup)
        cleanup.add_done_callback(self._cleanup_tasks.discard)
        return cleanup

    async def _cleanup_object(
        self, object_key: str, *, after: asyncio.Future[Any] | None
    ) -> None:
        if after is not None:
            try:
                await asyncio.shield(after)
            except BaseException:
                pass

        try:
            loop = asyncio.get_running_loop()
            deadline = loop.time() + self._operation_timeout_seconds
            delete_future = await self._submit_sdk(
                self._client.delete_object,
                deadline=deadline,
                Bucket=self._bucket,
                Key=object_key,
            )
            remaining = deadline - loop.time()
            if remaining > 0:
                await asyncio.wait_for(asyncio.shield(delete_future), timeout=remaining)
        except BaseException:
            # Cleanup is deliberately best effort and its provider response is never surfaced.
            pass

    async def _close(self) -> None:
        try:
            # Active uploads must reach their cancellation/timeout ``finally`` paths before
            # cleanup is drained. Otherwise a late cleanup can be registered after the worker
            # pool has already begun shutting down.
            await self._active_operations_drained.wait()
            await self.wait_for_cleanup()
        finally:
            shutdown = partial(
                self._executor.shutdown, wait=True, cancel_futures=False
            )
            loop = asyncio.get_running_loop()
            try:
                await loop.run_in_executor(None, shutdown)
            except BaseException:
                # If the internal close task itself is cancelled during loop teardown, finish
                # the idempotent executor shutdown before allowing cancellation to escape.
                shutdown()
                raise

    def _begin_public_operation(self) -> None:
        # The check and registration contain no await, so close cannot begin between them on
        # the owning event loop. Once close flips ``_closed``, no new public SDK work is admitted.
        self._ensure_open()
        if self._active_operations == 0:
            self._active_operations_drained.clear()
        self._active_operations += 1

    def _end_public_operation(self) -> None:
        self._active_operations -= 1
        if self._active_operations == 0:
            self._active_operations_drained.set()

    def _ensure_open(self) -> None:
        if self._closed:
            raise MediaStorageError("media storage is closed") from None


def _resolve_factories(
    client_factory: ClientFactory | None, config_factory: ConfigFactory | None
) -> tuple[ClientFactory, ConfigFactory]:
    if client_factory is not None and config_factory is not None:
        return client_factory, config_factory
    if (client_factory is None) != (config_factory is None):
        raise MediaStorageConfigurationError(
            "media storage configuration is invalid"
        ) from None

    try:
        import boto3
        from botocore.config import Config
    except Exception:
        raise MediaStorageConfigurationError(
            "media storage configuration is invalid"
        ) from None
    return boto3.client, Config


def _read_setting(settings: StorageSettings, name: str) -> str:
    failed = False
    value: Any = None
    try:
        value = getattr(settings, name)
    except Exception:
        failed = True

    if failed:
        raise MediaStorageConfigurationError(
            "media storage configuration is invalid"
        ) from None
    if not isinstance(value, str) or not value:
        raise MediaStorageConfigurationError(
            "media storage configuration is invalid"
        ) from None
    return value


def _read_optional_setting(settings: StorageSettings, name: str, default: Any) -> Any:
    try:
        return getattr(settings, name)
    except AttributeError:
        return default
    except Exception:
        pass
    raise MediaStorageConfigurationError(
        "media storage configuration is invalid"
    ) from None


def _read_secret_setting(settings: StorageSettings, name: str) -> str:
    failed = False
    secret: Any = None
    try:
        value = getattr(settings, name)
        getter = getattr(value, "get_secret_value", None)
        secret = getter() if callable(getter) else value
    except Exception:
        failed = True

    if failed:
        raise MediaStorageConfigurationError(
            "media storage configuration is invalid"
        ) from None

    if (
        not isinstance(secret, str)
        or not secret
        or "\x00" in secret
        or "\n" in secret
        or "\r" in secret
    ):
        raise MediaStorageConfigurationError(
            "media storage configuration is invalid"
        ) from None
    return secret


def _validate_endpoint(endpoint: str) -> str:
    try:
        parsed = urlsplit(endpoint)
        port = parsed.port
        valid = (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and _R2_HOST_PATTERN.fullmatch(parsed.hostname.lower()) is not None
            and parsed.username is None
            and parsed.password is None
            and port is None
            and parsed.query == ""
            and parsed.fragment == ""
            and parsed.path in ("", "/")
        )
    except Exception:
        valid = False
    if not valid:
        raise MediaStorageConfigurationError(
            "media storage configuration is invalid"
        ) from None
    return f"https://{parsed.hostname.lower()}"


def _validate_bucket(bucket: str) -> str:
    if bucket != PREVIEW_R2_BUCKET:
        raise MediaStorageConfigurationError(
            "media storage configuration is invalid"
        ) from None
    return bucket


def _validate_positive_int(value: int, message: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise MediaStorageConfigurationError(message) from None
    return value


def _validate_timeout(value: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise MediaStorageConfigurationError(
            "media storage timeout is invalid"
        ) from None
    timeout = float(value)
    if not math.isfinite(timeout) or timeout <= 0:
        raise MediaStorageConfigurationError(
            "media storage timeout is invalid"
        ) from None
    return timeout


def _validate_worker_count(value: int) -> int:
    workers = _validate_positive_int(value, "media storage worker count is invalid")
    if workers > _MAX_WORKERS_LIMIT:
        raise MediaStorageConfigurationError(
            "media storage worker count is invalid"
        ) from None
    return workers


def _require_owner(owner: UploadOwner) -> UploadOwner:
    if not isinstance(owner, UploadOwner):
        raise StorageOwnershipError("upload owner is invalid") from None
    # Recreate the value to guard against unsafe deserialization or object mutation tricks.
    return UploadOwner(kind=owner.kind, identifier=owner.identifier)


def _validate_bytes(
    payload: bytes | bytearray | memoryview, max_bytes: int
) -> bytes:
    if not isinstance(payload, (bytes, bytearray, memoryview)):
        raise MediaValidationError("media bytes are invalid") from None
    byte_size = payload.nbytes if isinstance(payload, memoryview) else len(payload)
    if byte_size <= 0 or byte_size > max_bytes:
        raise MediaValidationError("media size is invalid") from None
    media_bytes = bytes(payload)
    if len(media_bytes) != byte_size:
        raise MediaValidationError("media size is invalid") from None
    return media_bytes


def _validate_media_type(payload: bytes, declared_content_type: str) -> _MediaType:
    if not isinstance(declared_content_type, str):
        raise MediaValidationError("media content type is invalid") from None
    media_type = _MEDIA_TYPES.get(declared_content_type)
    if media_type is None or not media_type.matches(payload):
        raise MediaValidationError("media content type is invalid") from None

    detected = [
        content_type
        for content_type, candidate in _MEDIA_TYPES.items()
        if candidate.matches(payload)
    ]
    if detected != [declared_content_type]:
        raise MediaValidationError("media content type is invalid") from None
    return media_type


def _validate_owned_key(object_key: str, owner: UploadOwner) -> None:
    if not isinstance(object_key, str) or not object_key.startswith(owner.prefix):
        raise StorageOwnershipError("object is outside the owner scope") from None
    generated_name = object_key[len(owner.prefix) :]
    if _GENERATED_NAME_PATTERN.fullmatch(generated_name) is None:
        raise StorageOwnershipError("object is outside the owner scope") from None


def _safe_etag(response: Any) -> str | None:
    if not isinstance(response, Mapping):
        return None
    etag = response.get("ETag")
    if not isinstance(etag, str):
        return None
    return etag.strip('"') or None
