from __future__ import annotations

import inspect
import re

from api.app.training import service as training_service


def test_training_service_never_updates_or_deletes_append_only_tables() -> None:
    source = inspect.getsource(training_service)

    for table in ("training_events", "xp_ledger"):
        assert re.search(rf"\bINSERT\s+INTO\s+{table}\b", source, re.IGNORECASE)
        assert re.search(
            rf"\bSELECT\b[\s\S]*?\b(?:FROM|JOIN)\s+{table}\b",
            source,
            re.IGNORECASE,
        )
        assert not re.search(rf"\bUPDATE\s+{table}\b", source, re.IGNORECASE)
        assert not re.search(rf"\bDELETE\s+FROM\s+{table}\b", source, re.IGNORECASE)
