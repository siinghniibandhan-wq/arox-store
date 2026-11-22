# Arox Store API
Independent FastAPI service for Arox Store customer accounts and automated review moderation.

## Local setup
Use Python 3.12 and PostgreSQL. Copy `.env.example` to `.env`, set a unique JWT secret, database URL, SMTP credentials, AI moderation key and frontend origin.
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Health check: `/health`; interactive API docs: `/docs`.

## Automated decisions
- Publish only when automated safety moderation explicitly returns safe.
- Reject unsafe content and excessive links.
- Hold uncertain, unavailable or insufficient-content cases for moderation.
- Do not reject a review merely because it is negative.
- Only approved reviews contribute to public aggregates.
- Admin access is never granted through public registration.

## Security and launch
Passwords use scrypt; email verification is required; access tokens expire after 30 minutes. Configure HTTPS, production rate limiting at the gateway, SMTP and AI moderation before accepting live traffic. Create the first administrator only through a controlled database operation. This backend is not live until deployed with production secrets and PostgreSQL.
