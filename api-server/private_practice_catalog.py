"""Server-only reviewed catalog imports. No private content belongs in Git."""

import hashlib
import json
import re


SOURCES = frozenset({"question-bank", "quantguide", "interview-xiaohongshu", "interview-onepoint3acres", "interview-glassdoor"})
MAX_IMPORT_BYTES = 25 * 1024 * 1024


def validate_private_catalog(payload, source, expected_count):
    if not isinstance(source, str) or source not in SOURCES:
        raise ValueError("Unsupported private catalog source.")
    rows = payload.get("problems") if isinstance(payload, dict) else payload
    if type(expected_count) is not int or not 1 <= expected_count <= 5000 or not isinstance(rows, list) or len(rows) != expected_count:
        raise ValueError("Private catalog count does not match the expected count.")
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or row.get("source") != source or row.get("visibility") != "private" or row.get("ownerUserId"):
            raise ValueError("Every imported question must belong to the selected private source.")
        identity = row.get("id")
        if not isinstance(identity, str) or not identity.strip() or identity != identity.strip() or len(identity) > 512 or identity in seen:
            raise ValueError("Private catalog IDs must be nonempty and unique.")
        seen.add(identity)
        if not any(isinstance(row.get(key), str) and row[key].strip() for key in ("title", "titleZh", "titleEn")):
            raise ValueError("Private catalog question title is missing.")
        if not any(isinstance(row.get(key), str) and row[key].strip() for key in ("prompt", "promptZh", "promptEn")):
            raise ValueError("Private catalog question text is missing.")
        if source == "question-bank":
            taxonomy = row.get("practiceTaxonomy")
            if not isinstance(taxonomy, dict) or not all(isinstance(taxonomy.get(key), str) and taxonomy[key].strip()
                    for key in ("chapterId", "sectionId", "chapterZh", "chapterEn", "sectionZh", "sectionEn")):
                raise ValueError("Purple Book chapter metadata is incomplete.")
            if not all(type(taxonomy.get(key)) is int and taxonomy[key] > 0 for key in ("chapterOrder", "questionOrder")) \
                    or type(taxonomy.get("sectionOrder")) is not int or taxonomy["sectionOrder"] < 0:
                raise ValueError("Purple Book question order is invalid.")
        else:
            review = row.get("review")
            if not isinstance(review, dict) or not all(isinstance(review.get(key), dict)
                    and isinstance(review[key].get("status"), str) and review[key]["status"] in {"approved_manual", "approved_source"}
                    for key in ("prompt", "classification", "answer")):
                raise ValueError("Every imported question must have approved review metadata.")
    # Hash only the supplied data; the original metadata and text remain intact.
    content = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
    return rows, hashlib.sha256(content).hexdigest()


def is_curated_private_problem(problem):
    if not isinstance(problem, dict) or problem.get("visibility") != "private" or not isinstance(problem.get("source"), str) or problem["source"] not in SOURCES:
        return False
    marker = problem.get("privatePracticeCatalog")
    return isinstance(marker, dict) and type(marker.get("version")) is int and marker["version"] == 1 \
        and marker.get("source") == problem["source"] and type(marker.get("problemCount")) is int \
        and marker["problemCount"] > 0 and isinstance(marker.get("sha256"), str) \
        and re.fullmatch(r"[a-f0-9]{64}", marker["sha256"]) is not None


def is_retired_private_problem(problem):
    return is_curated_private_problem(problem) and problem["privatePracticeCatalog"].get("retired") is True


def lock_problem_catalog(conn, backend):
    # Shared with startup imports so an old repository snapshot cannot race a
    # reviewed import. Readers continue using the previously committed catalog.
    if backend == "postgres":
        conn.execute("LOCK TABLE problems IN SHARE ROW EXCLUSIVE MODE")
    elif not conn.in_transaction:
        conn.execute("BEGIN IMMEDIATE")


def _document(value):
    if isinstance(value, dict):
        return value
    try:
        result = json.loads(value)
        return result if isinstance(result, dict) else {}
    except (TypeError, ValueError):
        return {}


def import_private_catalog(database, payload, source, expected_count, imported_at):
    rows, digest = validate_private_catalog(payload, source, expected_count)
    ids = {row["id"] for row in rows}
    marker = {"version": 1, "source": source, "problemCount": expected_count, "sha256": digest,
              "importedAt": imported_at, "retired": False}
    incoming = [{**row, "privatePracticeCatalog": dict(marker)} for row in rows]
    with database.connect() as conn:
        lock_problem_catalog(conn, database.backend)
        ordered_ids = sorted(ids)
        for offset in range(0, len(ordered_ids), 400):
            batch = ordered_ids[offset:offset + 400]
            placeholders = ",".join("?" for _ in batch)
            conflicts = conn.execute(f"SELECT id, source, visibility, owner_user_id FROM problems WHERE id IN ({placeholders})", batch).fetchall()
            if any(row["source"] != source or row["visibility"] == "user" or row["owner_user_id"] for row in conflicts):
                raise ValueError("An imported ID conflicts with another source or a user-owned question.")
        existing = conn.execute("SELECT id, problem_json FROM problems WHERE source = ? AND visibility IN ('public', 'private')", (source,)).fetchall()
        saved = database.upsert_problems(conn, incoming, visibility="private", preserve_problem_visibility=True)
        if len(saved) != expected_count:
            raise ValueError("Private catalog import did not save every expected question.")
        retired = 0
        for row in existing:
            if row["id"] in ids:
                continue
            # Preserve the problem row and its FK-linked comments/likes. The
            # personal-state table is independent and is never written here.
            problem = {**_document(row["problem_json"]), "id": row["id"], "source": source, "visibility": "private",
                       "privatePracticeCatalog": {**marker, "retired": True}}
            conn.execute("UPDATE problems SET visibility = 'private', problem_json = ?, updated_at = ? WHERE id = ?",
                         (json.dumps(problem, ensure_ascii=False, separators=(",", ":")), imported_at, row["id"]))
            retired += 1
    return {"source": source, "problemCount": len(saved), "retiredCount": retired, "sha256": digest, "importedAt": imported_at}
