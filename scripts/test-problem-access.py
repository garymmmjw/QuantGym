#!/usr/bin/env python3
"""Source access rules without loading any user database."""

from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api-server"))
from problem_access import blocked_problem_sources, local_quantvault_enabled, quantvault_enabled


class ProblemAccessTests(unittest.TestCase):
    def test_local_opt_in_requires_loopback_bind(self):
        for host in ("127.0.0.1", "localhost", "::1"):
            self.assertTrue(local_quantvault_enabled(True, host))
            self.assertFalse(local_quantvault_enabled(False, host))
        for host in ("0.0.0.0", "::", "api.quantgym.app", "127.0.0.1.example.com", ""):
            self.assertFalse(local_quantvault_enabled(True, host))
        self.assertFalse(local_quantvault_enabled("1", "127.0.0.1"))

    def test_production_opt_in_is_explicit_and_preserves_local_boundary(self):
        self.assertFalse(quantvault_enabled())
        self.assertFalse(quantvault_enabled(False, True, "0.0.0.0"))
        self.assertTrue(quantvault_enabled(False, True, "127.0.0.1"))
        self.assertTrue(quantvault_enabled(True, False, "0.0.0.0"))
        self.assertFalse(quantvault_enabled("1", False, "0.0.0.0"))
        self.assertEqual(blocked_problem_sources(False, quantvault_enabled(True)), {"question-bank", "quantvault"})
        self.assertEqual(blocked_problem_sources(True, quantvault_enabled(True)), set())

    def test_nonmembers_cannot_read_either_vip_source(self):
        for local in (True, False):
            self.assertEqual(blocked_problem_sources(False, local), {"question-bank", "quantvault"})

    def test_member_access_does_not_override_local_release_boundary(self):
        self.assertEqual(blocked_problem_sources(True), {"quantvault"})
        self.assertEqual(blocked_problem_sources(True, True), set())


if __name__ == "__main__":
    unittest.main(verbosity=2)
