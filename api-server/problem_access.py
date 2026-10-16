"""Shared server-side source gates, independent of client catalog visibility."""


MEMBER_PROBLEM_SOURCES = frozenset({"question-bank", "quantvault"})
FEATURE_GATED_PROBLEM_SOURCES = frozenset({"quantvault"})


def local_quantvault_enabled(enabled, host):
    """A local preview opt-in must never turn on a network-facing deployment."""
    return enabled is True and str(host).strip().lower() in {"127.0.0.1", "localhost", "::1"}


def quantvault_enabled(enabled=False, local_enabled=False, host=""):
    """Production access is explicit; the legacy preview flag stays loopback-only."""
    return enabled is True or local_quantvault_enabled(local_enabled, host)


def blocked_problem_sources(is_member, quantvault=False):
    blocked = set() if is_member else set(MEMBER_PROBLEM_SOURCES)
    if not quantvault:
        blocked.update(FEATURE_GATED_PROBLEM_SOURCES)
    return frozenset(blocked)
