from app.security import hash_password, verify_password


def test_password_hash_is_not_plaintext_and_verifies():
    password = "Correct-Horse-Battery-42!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)


def test_wrong_password_does_not_verify():
    hashed = hash_password("Correct-Horse-Battery-42!")
    assert not verify_password("wrong-password", hashed)
