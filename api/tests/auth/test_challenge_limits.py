from __future__ import annotations

from pydantic import SecretStr

from api.app.auth.challenge_limits import PreAuthChallengeRateLimiter


SECRET = "challenge-limit-secret-for-tests-000000000000000000000"
BROWSER = "A" * 43


class MutableMonotonic:
    def __init__(self) -> None:
        self.value = 0.0

    def __call__(self) -> float:
        return self.value


def test_browser_and_ip_windows_are_independent_and_return_stable_delay() -> None:
    clock = MutableMonotonic()
    limiter = PreAuthChallengeRateLimiter(
        signing_secret=SecretStr(SECRET),
        browser_max_starts=2,
        ip_max_starts=3,
        window_seconds=60,
        monotonic=clock,
    )

    assert limiter.check_and_record(
        client_ip="203.0.113.7", browser_binding=BROWSER
    ) is None
    assert limiter.check_and_record(
        client_ip="203.0.113.7", browser_binding=BROWSER
    ) is None
    assert limiter.check_and_record(
        client_ip="203.0.113.8", browser_binding=BROWSER
    ) == 60

    # A fresh browser on the first IP has one remaining IP admission.
    assert limiter.check_and_record(
        client_ip="203.0.113.7", browser_binding="B" * 43
    ) is None
    assert limiter.check_and_record(
        client_ip="203.0.113.7", browser_binding="C" * 43
    ) == 60

    clock.value = 59.2
    assert limiter.check_and_record(
        client_ip="203.0.113.8", browser_binding=BROWSER
    ) == 1
    clock.value = 60
    assert limiter.check_and_record(
        client_ip="203.0.113.8", browser_binding=BROWSER
    ) is None


def test_ipv6_addresses_share_a_64_bucket_and_entries_remain_bounded() -> None:
    limiter = PreAuthChallengeRateLimiter(
        signing_secret=SECRET,
        browser_max_starts=1,
        ip_max_starts=2,
        window_seconds=60,
        capacity=2,
        monotonic=lambda: 0,
    )

    assert limiter.check_and_record(
        client_ip="2001:db8:1:2::1", browser_binding=None
    ) is None
    assert limiter.check_and_record(
        client_ip="2001:db8:1:2::ffff", browser_binding=None
    ) is None
    assert limiter.check_and_record(
        client_ip="2001:db8:1:2::abcd", browser_binding=None
    ) == 60

    for index in range(10):
        assert limiter.check_and_record(
            client_ip=f"198.51.100.{index}", browser_binding=None
        ) is None
    assert len(limiter._entries) == 2


def test_invalid_browser_values_fall_back_to_the_trusted_ip_bucket() -> None:
    limiter = PreAuthChallengeRateLimiter(
        signing_secret=SECRET,
        browser_max_starts=1,
        ip_max_starts=2,
        window_seconds=60,
        monotonic=lambda: 0,
    )

    assert limiter.check_and_record(
        client_ip="not-an-edge-ip", browser_binding="malformed"
    ) is None
    assert limiter.check_and_record(client_ip="unknown", browser_binding=None) is None
    assert limiter.check_and_record(client_ip="also-invalid", browser_binding=None) == 60
