#!/usr/bin/env python3
"""Readiness HTTP tests using the existing isolated local API harness."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("health_http_harness", ROOT / "scripts/test-leetcode-api.py")
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)
base = harness.LeetCodeApiTests


class ApiHealthTests(unittest.TestCase):
    setUpClass = base.__dict__["setUpClass"]
    tearDownClass = base.__dict__["tearDownClass"]
    start_postgres = base.__dict__["start_postgres"]
    request = base.request

    def test_healthy_database_returns_200_and_supported_capabilities(self):
        status, body, _ = self.request("GET", "/api/health")
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])
        self.assertTrue(body["database"]["writable"])
        self.assertEqual(body["capabilities"]["boundedResponses"], 1)
        self.assertEqual(body["capabilities"]["personalPrepConditionalRead"], 1)

    def test_database_failure_returns_503_then_recovers_without_account_writes(self):
        for unhealthy in (
            {"backend": "postgres", "writable": False, "foreignKeys": False, "schemaTables": 0},
            {"backend": "postgres", "writable": False, "foreignKeys": True, "schemaTables": 22},
            {"backend": "sqlite", "writable": True, "foreignKeys": False, "schemaTables": 22},
        ):
            with patch.object(self.api.db, "health", return_value=unhealthy):
                for path in ("/health", "/api/health"):
                    status, body, _ = self.request("GET", path)
                    self.assertEqual(status, 503)
                    self.assertFalse(body["ok"])
                    self.assertEqual(body["database"], unhealthy)
        self.assertEqual(self.request("GET", "/api/health")[0], 200)


del base

if __name__ == "__main__":
    unittest.main()
