from app.moderation import moderate_review


def test_clean_review_is_approved_only_when_ai_confirms_safe():
    result = moderate_review("Useful app", "The dashboard is clear and works well.", ai_result="safe")
    assert result.status == "approved"
    assert result.reason == "automated_checks_passed"


def test_negative_but_relevant_review_is_not_rejected():
    result = moderate_review("Disappointed", "The app crashes often and support did not respond.", ai_result="safe")
    assert result.status == "approved"


def test_spam_links_are_rejected():
    result = moderate_review("Great", "Visit https://spam.example and https://other.example", ai_result="safe")
    assert result.status == "rejected"
    assert result.reason == "excessive_links"


def test_uncertain_ai_result_is_held():
    result = moderate_review("Review", "Some feedback.", ai_result="uncertain")
    assert result.status == "pending"


def test_missing_ai_result_fails_closed_to_pending():
    result = moderate_review("Review", "Some feedback.", ai_result=None)
    assert result.status == "pending"
    assert result.reason == "ai_moderation_unavailable"
