from app.rate_limit import limit_for_path
def test_auth_endpoints_have_strict_limits():
    assert limit_for_path("/api/auth/login") == (10, 900)
    assert limit_for_path("/api/auth/register") == (5, 3600)
def test_review_submission_has_rate_limit():
    assert limit_for_path("/api/apps/finance-trading-os/reviews") == (60, 60)
def test_unrelated_health_route_is_not_rate_limited():
    assert limit_for_path("/health") is None
