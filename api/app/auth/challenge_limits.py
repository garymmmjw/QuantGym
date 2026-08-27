"""Bounded per-instance admission control for public pre-auth challenges."""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
import math
import threading
import time
from collections import OrderedDict, deque
from collections.abc import Callable

from pydantic import SecretStr


_BROWSER_DOMAIN = b"quantgym:v2:challenge-limit:browser:v1"
_IP_DOMAIN = b"quantgym:v2:challenge-limit:ip:v1"


class PreAuthChallengeRateLimiter:
    """A bounded sliding-window limiter shared by CSRF and OAuth starts.

    The database capacity locks remain the cross-instance final guard. This
    inexpensive outer layer prevents one browser or trusted edge IP from being
    able to consume that shared capacity in normal operation. Only keyed
    digests, never raw cookies or addresses, are retained in memory.
    """

    def __init__(
        self,
        *,
        signing_secret: SecretStr | str,
        browser_max_starts: int = 12,
        ip_max_starts: int = 60,
        window_seconds: float = 300,
        capacity: int = 10_000,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        raw_secret = (
            signing_secret.get_secret_value()
            if isinstance(signing_secret, SecretStr)
            else signing_secret
        )
        if (
            not isinstance(raw_secret, str)
            or len(raw_secret) < 32
            or not 1 <= browser_max_starts <= 100
            or not browser_max_starts <= ip_max_starts <= 1_000
            or not 1 <= window_seconds <= 3_600
            or not 2 <= capacity <= 100_000
            or not callable(monotonic)
        ):
            raise ValueError("pre-auth challenge limiter policy is invalid")
        self._key = raw_secret.encode("utf-8")
        self._browser_max_starts = browser_max_starts
        self._ip_max_starts = ip_max_starts
        self._window = float(window_seconds)
        self._capacity = capacity
        self._monotonic = monotonic
        self._entries: OrderedDict[bytes, deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def check_and_record(
        self,
        *,
        client_ip: str,
        browser_binding: SecretStr | str | None,
    ) -> int | None:
        """Record an admitted start, or return whole seconds until retry."""

        now = float(self._monotonic())
        if not math.isfinite(now):
            raise ValueError("pre-auth challenge limiter clock is invalid")
        dimensions: list[tuple[bytes, int]] = [
            (self._ip_key(client_ip), self._ip_max_starts),
        ]
        binding = self._browser_binding(browser_binding)
        if binding is not None:
            dimensions.append(
                (self._digest(_BROWSER_DOMAIN, binding), self._browser_max_starts)
            )

        with self._lock:
            retry_after: list[int] = []
            active_entries: list[tuple[bytes, deque[float], int]] = []
            for key, maximum in dimensions:
                attempts = self._entries.setdefault(key, deque())
                while attempts and now - attempts[0] >= self._window:
                    attempts.popleft()
                if len(attempts) >= maximum:
                    remaining = self._window - (now - attempts[0])
                    retry_after.append(max(1, math.ceil(remaining)))
                active_entries.append((key, attempts, maximum))

            if retry_after:
                for key, attempts, _maximum in active_entries:
                    if attempts:
                        self._entries.move_to_end(key)
                    else:
                        self._entries.pop(key, None)
                return max(retry_after)

            for key, attempts, _maximum in active_entries:
                attempts.append(now)
                self._entries.move_to_end(key)
            while len(self._entries) > self._capacity:
                self._entries.popitem(last=False)
        return None

    def _ip_key(self, value: str) -> bytes:
        canonical = "unknown"
        if isinstance(value, str):
            try:
                address = ipaddress.ip_address(value)
            except ValueError:
                pass
            else:
                if isinstance(address, ipaddress.IPv6Address):
                    canonical = str(
                        ipaddress.ip_network(f"{address}/64", strict=False).network_address
                    ) + "/64"
                else:
                    canonical = str(address)
        return self._digest(_IP_DOMAIN, canonical)

    @staticmethod
    def _browser_binding(value: SecretStr | str | None) -> str | None:
        if isinstance(value, SecretStr):
            value = value.get_secret_value()
        if not isinstance(value, str) or len(value) != 43:
            return None
        if any(
            not (
                character.isascii()
                and (character.isalnum() or character in "-_")
            )
            for character in value
        ):
            return None
        return value

    def _digest(self, domain: bytes, value: str) -> bytes:
        return hmac.new(
            self._key,
            domain + b"\x00" + value.encode("ascii"),
            hashlib.sha256,
        ).digest()
