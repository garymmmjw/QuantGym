#!/usr/bin/env python3
"""Real sockets, synthetic data only: HTTP bounds and protocol compatibility."""

import base64
import hashlib
import http.client
from http.server import BaseHTTPRequestHandler
import json
from pathlib import Path
import socket
import sys
import threading
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api-server"))
from runtime_limits import BoundedThreadingHTTPServer, RuntimeLimits, RuntimeLimitsHandlerMixin


class FixtureHandler(RuntimeLimitsHandlerMixin, BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def send_json(self, status, payload, headers=None):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        if self.close_connection:
            self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/hold":
            with self.server.fixture_lock:
                self.server.holding += 1
            self.server.release_holds.wait(timeout=3)
            self.send_json(200, {"held": True})
        elif path == "/api/poker/ws/fixture":
            self.send_response(101)
            self.send_header("Upgrade", "websocket")
            self.send_header("Connection", "Upgrade")
            if self.headers.get("Sec-WebSocket-Key"):
                accept = base64.b64encode(hashlib.sha1((self.headers["Sec-WebSocket-Key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
                self.send_header("Sec-WebSocket-Accept", accept)
            self.end_headers()
            self.close_connection = True
            self.server.websocket_ready.set()
            # One actual masked ping frame and unmasked pong frame.
            frame = self.rfile.read(7)
            if len(frame) == 7:
                self.wfile.write(b"\x8a\x01" + bytes([frame[6] ^ frame[2]]))
        elif path == "/stream":
            chunk = "流".encode() * 8192
            self.send_response(200)
            self.send_header("Content-Length", str(len(chunk) * 64))
            self.end_headers()
            for _ in range(64):
                self.wfile.write(chunk)
        elif path == "/abort":
            self.send_response(200)
            self.send_header("Content-Length", str(32 * 1024 * 1024))
            self.end_headers()
            self.server.abort_ready.set()
            self.server.release_abort.wait(timeout=3)
            for _ in range(512):
                self.wfile.write(b"x" * 65536)
        else:
            self.send_json(200, {"ok": True, "state": self.server.state})

    def do_PUT(self):
        data = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        # A disconnected/truncated upload must not become a write.
        if len(data) != int(self.headers.get("Content-Length", "0")):
            self.close_connection = True
            return
        self.server.state = json.loads(data)
        self.send_json(200, {"state": self.server.state})

    do_POST = do_PUT


def eventually(predicate, timeout=2):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.01)
    raise AssertionError("condition did not become true")


class RuntimeLimitsTests(unittest.TestCase):
    def setUp(self):
        self.metrics = []
        self.servers = []
        self.clients = []
        self.server = self.make_server()

    def make_server(self, **overrides):
        config = {"idle_timeout": 0.25, "io_timeout": 1.0, "admission_timeout": 0.05, **overrides}
        server = BoundedThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler,
                                           limits=RuntimeLimits(**config), metric_sink=self.metrics.append)
        server.fixture_lock = threading.Lock()
        server.holding = 0
        server.release_holds = threading.Event()
        server.release_abort = threading.Event()
        server.abort_ready = threading.Event()
        server.websocket_ready = threading.Event()
        server.state = {"fixture": "initial"}
        thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
        thread.start()
        self.servers.append((server, thread))
        return server

    def tearDown(self):
        for server, _ in self.servers:
            server.release_holds.set()
            server.release_abort.set()
        for client in self.clients:
            client.close()
        for server, thread in self.servers:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def connection(self, server=None):
        conn = http.client.HTTPConnection("127.0.0.1", (server or self.server).server_port, timeout=2)
        self.clients.append(conn)
        return conn

    def raw(self, server=None):
        sock = socket.create_connection(("127.0.0.1", (server or self.server).server_port), timeout=2)
        self.clients.append(sock)
        return sock

    def request(self, method, path, body=None, conn=None):
        conn = conn or self.connection()
        conn.request(method, path, body=body, headers={"Content-Type": "application/json"})
        response = conn.getresponse()
        return response.status, dict(response.getheaders()), response.read()

    def hold_two_requests(self):
        first, second = self.connection(), self.connection()
        first.request("GET", "/hold")
        second.request("GET", "/hold")
        eventually(lambda: self.server.holding == 2)
        return first, second

    def test_http11_reuses_connection_across_reads_and_writes(self):
        conn = self.connection()
        for method in ("PUT", "POST"):
            data = json.dumps({"fixture": method, "unicode": "数据"}, ensure_ascii=False).encode()
            status, _, body = self.request(method, "/api/state", data, conn)
            self.assertEqual(status, 200)
            original_socket = conn.sock
            status, _, fetched = self.request("GET", "/api/state", conn=conn)
            self.assertEqual(json.loads(fetched)["state"], json.loads(body)["state"])
            self.assertIs(conn.sock, original_socket)

    def test_two_long_requests_reject_work_but_preserve_health(self):
        holders = self.hold_two_requests()
        for method in ("GET", "PUT", "POST"):
            status, headers, body = self.request(method, "/api/state", b'{"fixture":"must-not-write"}')
            self.assertEqual(status, 503)
            self.assertEqual(headers["Retry-After"], "2")
            self.assertEqual(headers["Connection"], "close")
            self.assertIn("error", json.loads(body))
        status, _, body = self.request("GET", "/api/health?token=private-fixture")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["state"], {"fixture": "initial"})
        self.server.release_holds.set()
        for conn in holders:
            self.assertEqual(conn.getresponse().read(), b'{"held": true}')
        eventually(lambda: self.server._request_slots._value == 2)
        status, _, _ = self.request("PUT", "/api/state", b'{"fixture":"after-overload"}')
        self.assertEqual(status, 200)
        self.assertEqual(self.server.state, {"fixture": "after-overload"})

    def test_overloaded_write_does_not_wait_for_or_parse_body(self):
        self.hold_two_requests()
        sock = self.raw()
        sock.sendall(b"PUT /api/state HTTP/1.1\r\nHost: localhost\r\nContent-Length: 25000000\r\n\r\n")
        response = http.client.HTTPResponse(sock)
        response.begin()
        self.assertEqual(response.status, 503)
        response.read()
        self.assertEqual(sock.recv(1), b"")
        self.assertEqual(self.server.state, {"fixture": "initial"})

    def test_queued_write_receives_released_slot_and_preserves_body(self):
        holders = self.hold_two_requests()
        result = []
        worker = threading.Thread(target=lambda: result.append(self.request("PUT", "/api/state", b'{"fixture":"queued-write"}')))
        worker.start()
        # Wait for the queued connection to exist before releasing the holders.
        eventually(lambda: self.server._connection_slots._value == 29)
        self.server.release_holds.set()
        worker.join(timeout=2)
        self.assertFalse(worker.is_alive())
        self.assertEqual(result[0][0], 200)
        self.assertEqual(self.server.state, {"fixture": "queued-write"})
        for conn in holders:
            conn.getresponse().read()

    def test_default_two_second_admission_timeout_keeps_health_available(self):
        server = self.make_server(admission_timeout=RuntimeLimits().admission_timeout)
        holders = [self.connection(server), self.connection(server)]
        for conn in holders:
            conn.request("GET", "/hold")
        eventually(lambda: server.holding == 2)
        result = []
        waiting = self.connection(server)
        waiting.timeout = 4
        started = time.monotonic()
        worker = threading.Thread(target=lambda: result.append(self.request("GET", "/api/state", conn=waiting)))
        worker.start()
        eventually(lambda: server._connection_slots._value == 29)
        self.assertEqual(self.request("GET", "/api/health", conn=self.connection(server))[0], 200)
        worker.join(timeout=4)
        self.assertFalse(worker.is_alive())
        self.assertEqual(result[0][0], 503)
        self.assertGreaterEqual(time.monotonic() - started, 1.9)
        server.release_holds.set()
        for conn in holders:
            conn.getresponse().read()

    def test_idle_connections_have_a_finite_cap_and_timeout(self):
        server = self.make_server(max_connections=2)
        first, second = self.raw(server), self.raw(server)
        eventually(lambda: server._connection_slots._value == 0)
        third = self.raw(server)
        response = http.client.HTTPResponse(third)
        response.begin()
        self.assertEqual(response.status, 503)
        self.assertEqual(json.loads(response.read()), {"error": "Server busy"})
        eventually(lambda: server._connection_slots._value == 2)
        self.assertEqual(first.recv(1), b"")
        self.assertEqual(second.recv(1), b"")
        self.assertEqual(self.request("GET", "/api/health", conn=self.connection(server))[0], 200)

    def test_keepalive_timeout_releases_connection_but_not_a_request_slot(self):
        conn = self.connection()
        self.assertEqual(self.request("GET", "/api/state", conn=conn)[0], 200)
        eventually(lambda: self.server._request_slots._value == 2)
        eventually(lambda: self.server._connection_slots._value == 32)
        self.assertEqual(conn.sock.recv(1), b"")

    def test_interrupted_and_timed_out_uploads_do_not_leak_slots(self):
        for close_immediately in (True, False):
            sock = self.raw()
            sock.sendall(b"PUT /api/state HTTP/1.1\r\nHost: localhost\r\nContent-Length: 1000\r\n\r\n{")
            if close_immediately:
                sock.close()
            else:
                eventually(lambda: self.server._request_slots._value == 1)
                eventually(lambda: self.server._request_slots._value == 2)
                self.assertEqual(sock.recv(1), b"")
        self.assertEqual(self.server.state, {"fixture": "initial"})
        self.assertEqual(self.request("GET", "/api/health")[0], 200)

    def test_interrupted_response_releases_slot(self):
        sock = self.raw()
        sock.sendall(b"GET /abort HTTP/1.1\r\nHost: localhost\r\n\r\n")
        self.assertTrue(self.server.abort_ready.wait(timeout=2))
        sock.close()
        self.server.release_abort.set()
        eventually(lambda: self.server._request_slots._value == 2)
        eventually(lambda: any(metric.get("interrupted") for metric in self.metrics))
        self.assertEqual(self.request("GET", "/api/health")[0], 200)

    def test_websocket_has_own_bound_and_survives_http_idle_timeout(self):
        server = self.make_server(max_websockets=1, idle_timeout=0.08, io_timeout=0.08)
        conn = self.connection(server)
        conn.request("GET", "/api/poker/ws/fixture?token=SECRET", headers={"Upgrade": "websocket", "Connection": "Upgrade"})
        response = conn.getresponse()
        self.assertEqual(response.status, 101)
        self.assertTrue(server.websocket_ready.wait(timeout=2))
        another = self.connection(server)
        another.request("GET", "/api/poker/ws/fixture", headers={"Upgrade": "websocket"})
        self.assertEqual(another.getresponse().status, 503)
        self.assertEqual(self.request("PUT", "/api/state", b'{"fixture":"while-websocket"}', self.connection(server))[0], 200)
        time.sleep(0.16)
        conn.sock.sendall(b"\x89\x81\x01\x02\x03\x04" + bytes([ord("q") ^ 1]))
        self.assertEqual(conn.sock.recv(3), b"\x8a\x01q")
        eventually(lambda: server._websocket_slots._value == 1)

    def test_default_pool_accepts_ten_simultaneous_poker_websockets(self):
        self.assertEqual(RuntimeLimits().max_websockets, 16)
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(RuntimeLimits.from_env().max_websockets, 16)
        connections = []
        for player in range(10):
            conn = self.connection()
            connections.append(conn)
            key = base64.b64encode(player.to_bytes(16, "big")).decode()
            conn.request("GET", "/api/poker/ws/fixture", headers={
                "Upgrade": "websocket", "Connection": "Upgrade",
                "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": key,
            })
            response = conn.getresponse()
            self.assertEqual(response.status, 101, f"player {player + 1} was rejected")
            expected = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
            self.assertEqual(response.getheader("Sec-WebSocket-Accept"), expected)
        # All ten remain upgraded concurrently until the ping frames below.
        self.assertEqual(self.server._websocket_slots._value, 6)
        self.assertEqual(self.request("GET", "/api/health")[0], 200)
        self.assertEqual(self.request("PUT", "/api/state", b'{"fixture":"ten-players"}')[0], 200)
        for conn in connections:
            conn.sock.sendall(b"\x89\x81\x01\x02\x03\x04" + bytes([ord("q") ^ 1]))
        for conn in connections:
            self.assertEqual(conn.sock.recv(3), b"\x8a\x01q")
        eventually(lambda: self.server._websocket_slots._value == 16)

    def test_stream_bytes_and_metrics_exclude_sensitive_values(self):
        status, headers, body = self.request("GET", "/stream?token=SECRET&email=fixture@example.invalid")
        self.assertEqual(status, 200)
        self.assertEqual(len(body), int(headers["Content-Length"]))
        self.assertEqual(body, "流".encode() * 8192 * 64)
        eventually(lambda: bool(self.metrics))
        metric = self.metrics[-1]
        self.assertEqual(metric["responseBytes"], len(body))
        self.assertEqual(metric["route"], "/other")
        self.assertGreater(metric["peakRssBytes"], 0)
        serialized = json.dumps(self.metrics)
        for secret in ("SECRET", "fixture@example.invalid", "token", "/stream"):
            self.assertNotIn(secret, serialized)

    def test_invalid_and_unsupported_requests_release_connection_slots(self):
        sock = self.raw()
        sock.sendall(b"not-a-request\r\n\r\n")
        self.assertTrue(sock.recv(4096))
        self.assertEqual(self.request("TRACE", "/api/state")[0], 501)
        eventually(lambda: self.server._request_slots._value == 2)
        self.assertEqual(self.request("PUT", "/api/state", b'{"fixture":"still-works"}')[0], 200)

    def test_invalid_limits_fail_fast(self):
        for values in ({"max_requests": 0}, {"max_connections": -1}, {"idle_timeout": float("nan")}, {"io_timeout": 0}, {"admission_timeout": -1}):
            with self.assertRaises(ValueError):
                RuntimeLimits(**values)


if __name__ == "__main__":
    unittest.main(verbosity=2)
