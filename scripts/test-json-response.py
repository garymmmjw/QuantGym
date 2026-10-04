#!/usr/bin/env python3
"""Synthetic JSON response-spool regressions; no server or user data is used."""

import gc
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import weakref
from datetime import date, datetime, timezone


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("json_response", ROOT / "api-server/json_response.py")
response = importlib.util.module_from_spec(spec)
spec.loader.exec_module(response)


class JsonResponseTests(unittest.TestCase):
    def assert_body(self, payload, **kwargs):
        body, length = response.spool_json_response(payload, **kwargs)
        with body:
            self.assertEqual(body.tell(), 0)
            raw = body.read()
            self.assertEqual(length, len(raw))
            return raw, getattr(body, "_rolled", False)

    def test_small_response_matches_json_dumps_byte_for_byte_and_stays_in_memory(self):
        payload = {"text": "中文😀\n\t\"\\", "items": [1, 1.25, True, False, None], "nested": {"key": "value"}}
        raw, rolled = self.assert_body(payload)
        self.assertEqual(raw, json.dumps(payload, ensure_ascii=False).encode("utf-8"))
        self.assertEqual(json.loads(raw), payload)
        self.assertFalse(rolled)

    def test_large_payload_rolls_over_and_round_trips(self):
        payload = {"records": [{"index": index, "text": "训练😀" * 600} for index in range(400)]}
        raw, rolled = self.assert_body(payload)
        self.assertGreater(len(raw), response.JSON_SPOOL_MAX_SIZE)
        self.assertTrue(rolled)
        self.assertEqual(json.loads(raw), payload)

    def test_content_length_counts_utf8_bytes_including_multibyte_chunk_boundaries(self):
        payload = {"text": "中😀é" * 20000}
        raw, rolled = self.assert_body(payload, chunk_size=31)
        self.assertEqual(raw, json.dumps(payload, ensure_ascii=False).encode("utf-8"))
        self.assertGreater(len(raw), len(raw.decode("utf-8")))
        self.assertFalse(rolled)

    def test_injected_default_handles_api_dates(self):
        def api_default(value):
            if isinstance(value, datetime):
                return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
            if isinstance(value, date):
                return value.isoformat()
            raise TypeError("unsupported fixture value")

        payload = {"at": datetime(2026, 10, 4, 12, 0, tzinfo=timezone.utc), "day": date(2026, 10, 4)}
        raw, _ = self.assert_body(payload, default=api_default)
        self.assertEqual(raw, json.dumps(payload, ensure_ascii=False, default=api_default).encode("utf-8"))

    def test_streamed_array_matches_regular_envelope_including_key_order_and_conversion(self):
        rows = [{"text": "中文😀", "index": index} for index in range(15)]
        expected = {"before": True, 12: "numeric key", None: "none key", "problems": rows, "after": {"count": 15}}
        streamed = {**expected, "problems": iter(rows)}
        raw, _ = self.assert_body(streamed, array_field="problems")
        self.assertEqual(raw, json.dumps(expected, ensure_ascii=False).encode("utf-8"))

    def test_empty_streamed_array_is_valid_json(self):
        raw, _ = self.assert_body({"problems": iter(()), "count": 0}, array_field="problems")
        self.assertEqual(json.loads(raw), {"problems": [], "count": 0})

    def test_stream_is_single_pass_and_does_not_retain_prior_items(self):
        live = weakref.WeakSet()
        instances = []
        original_spool = tempfile.SpooledTemporaryFile

        class Record:
            def __init__(self, index):
                self.index = index
                live.add(self)

        class Records:
            def __init__(self):
                self.iterations = 0
                self.maximum_live = 0

            def __iter__(self):
                self.iterations += 1
                if self.iterations != 1:
                    raise AssertionError("array iterable consumed twice")
                for index in range(90):
                    record = Record(index)
                    self.maximum_live = max(self.maximum_live, len(live))
                    if index > 2:
                        self.assert_bytes_already_written()
                    yield record

            def assert_bytes_already_written(self):
                if not instances or instances[0].tell() == 0:
                    raise AssertionError("items were collected before writing the response")

        def make_spool(**kwargs):
            spool = original_spool(**kwargs)
            instances.append(spool)
            return spool

        records = Records()
        with patch.object(response.tempfile, "SpooledTemporaryFile", side_effect=make_spool):
            body, length = response.spool_json_response(
                {"records": records}, array_field="records",
                default=lambda record: {"index": record.index, "text": "x" * 40000},
            )
        with body:
            self.assertTrue(body._rolled)
            self.assertEqual(len(json.load(body)["records"]), 90)
            self.assertGreater(length, response.JSON_SPOOL_MAX_SIZE)
        gc.collect()
        self.assertEqual(records.iterations, 1)
        self.assertLessEqual(records.maximum_live, 2)
        self.assertEqual(len(live), 0)

    def test_fragments_are_batched_into_bounded_writes(self):
        writes = []
        original_spool = tempfile.SpooledTemporaryFile

        def make_spool(**kwargs):
            spool = original_spool(**kwargs)
            original_write = spool.write

            def write(data):
                writes.append(len(data))
                return original_write(data)

            spool.write = write
            return spool

        with patch.object(response.tempfile, "SpooledTemporaryFile", side_effect=make_spool):
            raw, _ = self.assert_body({"items": list(range(10000)), "large": "😀" * 20000})
        self.assertEqual(json.loads(raw)["items"][-1], 9999)
        self.assertLessEqual(max(writes), response.JSON_WRITE_CHUNK_SIZE)
        self.assertLess(len(writes), 6)

    def assert_failure_closes_spool(self, payload, exception, **kwargs):
        instances = []
        original_spool = tempfile.SpooledTemporaryFile

        def make_spool(**spool_kwargs):
            spool = original_spool(**spool_kwargs)
            instances.append(spool)
            return spool

        with patch.object(response.tempfile, "SpooledTemporaryFile", side_effect=make_spool):
            with self.assertRaises(exception):
                response.spool_json_response(payload, **kwargs)
        self.assertEqual(len(instances), 1)
        self.assertTrue(instances[0].closed)
        return instances[0]

    def test_encoding_failure_after_rollover_closes_temporary_file(self):
        spool = self.assert_failure_closes_spool(
            {"text": "x" * (response.JSON_SPOOL_MAX_SIZE * 2), "bad": object()}, TypeError,
        )
        self.assertTrue(spool._rolled)

    def test_iteration_failure_closes_temporary_file(self):
        def records():
            yield {"text": "x" * (response.JSON_SPOOL_MAX_SIZE * 2)}
            raise RuntimeError("synthetic iterator failure")

        spool = self.assert_failure_closes_spool({"records": records()}, RuntimeError, array_field="records")
        self.assertTrue(spool._rolled)

    def test_invalid_unicode_and_circular_payload_close_the_spool(self):
        self.assert_failure_closes_spool({"text": "\ud800"}, UnicodeEncodeError)
        circular = []
        circular.append(circular)
        self.assert_failure_closes_spool(circular, ValueError)

    def test_invalid_configuration_and_streamed_fields_fail_before_creating_a_file(self):
        invalid = [
            ({}, {"spool_max_size": 0}, ValueError),
            ({}, {"chunk_size": 0}, ValueError),
            ({}, {"array_field": "missing"}, KeyError),
            ([], {"array_field": "rows"}, TypeError),
            ({"rows": "not an array"}, {"array_field": "rows"}, TypeError),
        ]
        with patch.object(response.tempfile, "SpooledTemporaryFile") as constructor:
            for payload, kwargs, exception in invalid:
                with self.subTest(kwargs=kwargs), self.assertRaises(exception):
                    response.spool_json_response(payload, **kwargs)
            constructor.assert_not_called()


if __name__ == "__main__":
    unittest.main()
