import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import User
from app import main


@pytest.fixture
def client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(main.settings, "jwt_secret_key", "test-only-secret-that-is-long-enough")
    sent = {}
    def fake_send(email, token):
        sent["email"] = email
        sent["token"] = token
    monkeypatch.setattr(main, "send_verification_email", fake_send)
    monkeypatch.setattr(main, "ai_moderation_result", lambda title, body: "safe")
    with TestClient(main.app) as test_client:
        test_client.verification_email = sent
        yield test_client
    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_customer_registration_verification_login_and_review_publish(client):
    registration = client.post("/api/auth/register", json={
        "email": "customer@example.com",
        "password": "StrongPassword123",
    })
    assert registration.status_code == 202
    assert client.verification_email["email"] == "customer@example.com"

    verified = client.post("/api/auth/verify", params={"token": client.verification_email["token"]})
    assert verified.status_code == 200

    login = client.post("/api/auth/login", json={
        "email": "customer@example.com",
        "password": "StrongPassword123",
    })
    assert login.status_code == 200
    headers = {"Authorization": "Bearer " + login.json()["access_token"]}

    submitted = client.post("/api/apps/finance-trading-os/reviews", headers=headers, json={
        "rating": 5,
        "title": "Useful dashboard",
        "body": "The dashboard is clear and works well for my daily workflow.",
    })
    assert submitted.status_code == 201
    assert submitted.json()["status"] == "approved"

    published = client.get("/api/apps/finance-trading-os/reviews")
    assert published.status_code == 200
    assert published.json()["review_count"] == 1
    assert published.json()["average_rating"] == 5.0


def test_unverified_customer_cannot_login_or_submit_review(client):
    client.post("/api/auth/register", json={
        "email": "pending@example.com",
        "password": "StrongPassword123",
    })
    login = client.post("/api/auth/login", json={
        "email": "pending@example.com",
        "password": "StrongPassword123",
    })
    assert login.status_code == 403

    denied = client.post("/api/apps/arox-ai/reviews", json={
        "rating": 5, "title": "Nice", "body": "This is a sufficiently long review."
    })
    assert denied.status_code == 401


def test_customer_cannot_submit_two_reviews_for_same_app(client):
    client.post("/api/auth/register", json={
        "email": "repeat@example.com",
        "password": "StrongPassword123",
    })
    token = client.verification_email["token"]
    client.post("/api/auth/verify", params={"token": token})
    login = client.post("/api/auth/login", json={
        "email": "repeat@example.com",
        "password": "StrongPassword123",
    })
    headers = {"Authorization": "Bearer " + login.json()["access_token"]}
    payload = {"rating": 4, "title": "Good tool", "body": "A useful application for my work."}
    assert client.post("/api/apps/arox-ai/reviews", headers=headers, json=payload).status_code == 201
    assert client.post("/api/apps/arox-ai/reviews", headers=headers, json=payload).status_code == 409
