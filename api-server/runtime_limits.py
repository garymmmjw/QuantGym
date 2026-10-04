"""Bound HTTP work before allocating request bodies or complete response objects.

These limits contain bursts on the 512 MiB instance; they do not establish the
cause of its historical memory growth. Keep this module independent of the app
and database so rejected requests cannot create audit writes or alert threads.
"""

from __future__ import annotations

from dataclasses import dataclass
from http.server import ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import resource
import socket
import sys
import threading
import time
from urllib.parse import urlsplit


@dataclass(frozen=True)
class RuntimeLimits:
    max_connections: int = 32
    max_requests: int = 2
    max_health_requests: int = 2
    max_websockets: int = 16
    idle_timeout: float = 15.0
    io_timeout: float = 60.0
    admission_timeout: float = 2.0

    def __post_init__(self):
        for name in ("max_connections", "max_requests", "max_health_requests", "max_websockets"):
            value = getattr(self, name)
            if not isinstance(value, int) or isinstance(value, bool) or value < 1:
                raise ValueError(f"{name} must be a positive integer")
        for name in ("idle_timeout", "io_timeout"):
            value = getattr(self, name)
            if not math.isfinite(value) or value <= 0:
                raise ValueError(f"{name} must be finite and positive")
        if not math.isfinite(self.admission_timeout) or self.admission_timeout < 0:
            raise ValueError("admission_timeout must be finite and nonnegative")

    @classmethod
    def from_env(cls):
        return cls(
            max_connections=int(os.environ.get("QUANTGYM_HTTP_MAX_CONNECTIONS", "32")),
            max_requests=int(os.environ.get("QUANTGYM_HTTP_MAX_REQUESTS", "2")),
            max_health_requests=int(os.environ.get("QUANTGYM_HTTP_MAX_HEALTH_REQUESTS", "2")),
            max_websockets=int(os.environ.get("QUANTGYM_HTTP_MAX_WEBSOCKETS", "16")),
            idle_timeout=float(os.environ.get("QUANTGYM_HTTP_IDLE_TIMEOUT_SECONDS", "15")),
            io_timeout=float(os.environ.get("QUANTGYM_HTTP_IO_TIMEOUT_SECONDS", "60")),
            admission_timeout=float(os.environ.get("QUANTGYM_HTTP_ADMISSION_TIMEOUT_SECONDS", "2")),
        )


def memory_usage_bytes() -> dict:
    """Current RSS on Linux; portable high-water RSS (no external process)."""
    values = {}
    try:
        # Small fixed proc file; never reads environment or command-line secrets.
        fields = Path("/proc/self/statm").read_text().split()
        values["rssBytes"] = int(fields[1]) * os.sysconf("SC_PAGE_SIZE")
    except (OSError, ValueError, IndexError):
        pass
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    values["peakRssBytes"] = int(peak if sys.platform == "darwin" else peak * 1024)
    return values


def route_category(path: str) -> str:
    """A finite set of labels: never log IDs, query strings or unknown paths."""
    if path in {"/health", "/api/health", "/api/personal-prep", "/api/problems", "/api/state", "/api/sync", "/api/jobs"}:
        return path
    if path.startswith("/api/poker/"):
        return "/api/poker/*"
    if path.startswith("/api/library/"):
        return "/api/library/*"
    return "/api/other" if path.startswith("/api/") else "/other"


class BoundedThreadingHTTPServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, server_address, handler_class, *, limits=None, metric_sink=None):
        self.runtime_limits = limits or RuntimeLimits.from_env()
        self._connection_slots = threading.BoundedSemaphore(self.runtime_limits.max_connections)
        self._request_slots = threading.BoundedSemaphore(self.runtime_limits.max_requests)
        self._health_slots = threading.BoundedSemaphore(self.runtime_limits.max_health_requests)
        self._websocket_slots = threading.BoundedSemaphore(self.runtime_limits.max_websockets)
        self._metric_sink = metric_sink
        super().__init__(server_address, handler_class)

    def emit_runtime_metric(self, values):
        try:
            record = {"event": "http.runtime", **values, **memory_usage_bytes()}
            if self._metric_sink is not None:
                self._metric_sink(record)
            else:
                print(json.dumps(record, separators=(",", ":")), file=sys.stderr, flush=True)
        except Exception:
            # Observability must never change request success or leak slot leases.
            pass

    def process_request(self, request, client_address):
        if not self._connection_slots.acquire(blocking=False):
            # No handler/thread/body allocation. This small reply also bounds the
            # time spent in the accept loop when the connecting peer is stalled.
            try:
                request.settimeout(0.2)
                request.sendall(
                    b"HTTP/1.1 503 Service Unavailable\r\n"
                    b"Content-Type: application/json\r\n"
                    b"Content-Length: 23\r\nConnection: close\r\n"
                    b"Retry-After: 2\r\nCache-Control: no-store\r\n\r\n"
                    b'{"error":"Server busy"}'
                )
            except OSError:
                pass
            finally:
                self.shutdown_request(request)
            self.emit_runtime_metric({"reason": "connections", "status": 503})
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self._connection_slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self._connection_slots.release()


class _CountingWriter:
    """Forward the existing unbuffered socket writer, counting successful bytes."""

    def __init__(self, writer):
        self.writer = writer
        self.written = 0

    def write(self, data):
        count = self.writer.write(data)
        self.written += count
        return count

    def __getattr__(self, name):
        return getattr(self.writer, name)


class RuntimeLimitsHandlerMixin:
    """Place before BaseHTTPRequestHandler in the application handler's MRO."""

    def setup(self):
        self.request.settimeout(self.server.runtime_limits.idle_timeout)
        super().setup()
        self.wfile = _CountingWriter(self.wfile)

    def handle_one_request(self):
        self._runtime_slot = None
        self._runtime_started = None
        self._runtime_status = None
        self._runtime_body_start = None
        self._runtime_category = "/other"
        self._runtime_interrupted = False
        try:
            super().handle_one_request()
        except (ConnectionError, TimeoutError):
            self._runtime_interrupted = True
            self.close_connection = True
        finally:
            if self._runtime_slot is not None:
                self._runtime_slot.release()
                self._runtime_slot = None
            if self._runtime_started is not None:
                duration = round((time.monotonic() - self._runtime_started) * 1000, 1)
                body_bytes = self.wfile.written - self._runtime_body_start if self._runtime_body_start is not None else 0
                if duration >= 1000 or body_bytes >= 1024 * 1024 or (self._runtime_status or 0) >= 500 or self._runtime_interrupted:
                    self.server.emit_runtime_metric({
                        "route": self._runtime_category,
                        "method": self.command if self.command in {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"} else "OTHER",
                        "status": self._runtime_status,
                        "durationMs": duration,
                        "responseBytes": body_bytes,
                        "interrupted": self._runtime_interrupted,
                    })
            if not self.close_connection:
                self.connection.settimeout(self.server.runtime_limits.idle_timeout)

    def parse_request(self):
        if not super().parse_request():
            return False
        self._runtime_started = time.monotonic()
        try:
            path = urlsplit(self.path).path.rstrip("/") or "/"
        except ValueError:
            self.send_error(400, "Invalid request target")
            return False
        self._runtime_category = route_category(path)
        is_health = self.command == "GET" and path in {"/health", "/api/health"}
        is_websocket = (
            self.command == "GET" and path.startswith("/api/poker/ws/")
            and self.headers.get("Upgrade", "").lower() == "websocket"
        )
        slot = self.server._health_slots if is_health else self.server._websocket_slots if is_websocket else self.server._request_slots
        # A short queue lets the small parallel reads of page initialization
        # complete normally. Its total size is bounded by max_connections, and
        # no request body or business object has been allocated at this point.
        wait = 0 if is_health or is_websocket else self.server.runtime_limits.admission_timeout
        if not slot.acquire(timeout=wait):
            self.close_connection = True
            self.send_json(503, {"error": "Server busy. Retry shortly."}, headers={"Retry-After": "2", "Cache-Control": "no-store"})
            return False
        self._runtime_slot = slot
        self.connection.settimeout(self.server.runtime_limits.io_timeout)
        return True

    def send_response(self, code, message=None):
        self._runtime_status = code
        if code == 101:
            # A successfully upgraded Poker socket has its own bounded pool and
            # retains the previous long-lived WebSocket behavior, including idle.
            self.connection.settimeout(None)
        return super().send_response(code, message)

    def end_headers(self):
        super().end_headers()
        self._runtime_body_start = self.wfile.written
