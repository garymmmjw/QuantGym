"""Optional source metadata carried with a private Purple Book attempt.

The metadata describes where text came from and its editorial status. It does
not certify that an answer is correct. Existing attempts without it remain
valid, so updating the library never requires rewriting practice history.
"""

import re
from urllib.parse import urlsplit

PROVENANCE_TEXT_LIMITS = {
    "originalNumber": 100,
    "chapter": 500,
    "section": 500,
    "sourcePage": 100,
    "edition": 300,
    "sourceHashSHA256": 64,
    "sourceUrl": 2048,
    "sourceReference": 80_000,
    "sourceReferenceEn": 80_000,
    "reviewNotes": 80_000,
    "reviewNotesEn": 80_000,
}
PROVENANCE_ANSWER_STATUSES = {"source", "reviewed", "corrected", "supplemented", "missing"}
PROVENANCE_FIELDS = {"version", "pdfPage", "answerStatus", *PROVENANCE_TEXT_LIMITS}


def valid_source_url(value):
    if not isinstance(value, str) or re.search(r"[\x00-\x20\\]", value):
        return False
    try:
        parsed = urlsplit(value)
        return (
            parsed.scheme == "https"
            and parsed.hostname == "drive.google.com"
            and parsed.username is None
            and parsed.password is None
            and parsed.port is None
            and re.fullmatch(r"/file/d/[A-Za-z0-9_-]+(?:/(?:view|preview|edit))?/?", parsed.path) is not None
        )
    except ValueError:
        return False


def validate_technical_provenance(value):
    """Validate without altering the attempt's original source snapshot."""
    if not isinstance(value, dict) or set(value) - PROVENANCE_FIELDS or type(value.get("version")) is not int or value["version"] != 1:
        raise ValueError("Invalid Purple Book provenance version or fields.")
    for field, maximum in PROVENANCE_TEXT_LIMITS.items():
        if field not in value:
            continue
        item = value[field]
        try:
            valid = isinstance(item, str) and len(item.encode("utf-16-le")) // 2 <= maximum
        except UnicodeEncodeError:
            valid = False
        if not valid:
            raise ValueError("Invalid Purple Book provenance text.")
    if "pdfPage" in value and (type(value["pdfPage"]) is not int or not 1 <= value["pdfPage"] <= 100_000):
        raise ValueError("Invalid Purple Book PDF page.")
    if "sourceHashSHA256" in value and not re.fullmatch(r"[A-Fa-f0-9]{64}", value["sourceHashSHA256"]):
        raise ValueError("Invalid Purple Book source hash.")
    if "sourceUrl" in value and not valid_source_url(value["sourceUrl"]):
        raise ValueError("Invalid Purple Book source URL.")
    if "answerStatus" in value and (not isinstance(value["answerStatus"], str) or value["answerStatus"] not in PROVENANCE_ANSWER_STATUSES):
        raise ValueError("Invalid Purple Book answer status.")
    return value
