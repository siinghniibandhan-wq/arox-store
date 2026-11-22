# Arox Store API

Independent FastAPI service for Arox Store customer accounts and automated review moderation.

## Local development

Use Python 3.12 and PostgreSQL. Copy `.env.example` to `.env`, set a unique JWT secret, PostgreSQL URL, Redis URL, SMTP credentials, AI moderation key and frontend origin.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Health check: `/health`; interactive API docs: `/docs`.

## Production deployment on a Linux Docker host

1. Point a DNS A/AAAA record for your API hostname to the server public IP. Allow inbound TCP 80 and 443; do not expose PostgreSQL, Redis or API port 8000.
2. Copy this `backend/` directory to the server.
3. Create a production `.env` from `.env.example`. Generate independent strong secrets for `JWT_SECRET_KEY`, `POSTGRES_PASSWORD`, and `REDIS_PASSWORD`. Configure SMTP and OpenAI moderation credentials. Set `API_DOMAIN` and `ACME_EMAIL`.
4. Keep the file private: `chmod 600 .env`. Never commit it.
5. Start the stack: `docker compose up -d --build`.
6. Check health: `docker compose ps` and `curl https://$API_DOMAIN/health`.
7. Configure the GitHub Pages frontend API base to `https://$API_DOMAIN` in the `arox-api-base` meta tag, then deploy the frontend.
8. Create the first admin through a controlled database operation after deployment; never grant admin from public registration.

The Compose stack keeps PostgreSQL and Redis on a private Docker network, exposes only Caddy's 80/443 ports, obtains TLS automatically, and runs the API as a non-root user. Configure automated encrypted database backups and server monitoring before production traffic.

## Customer journey

- Register: `POST /api/auth/register`
- Verify: `POST /api/auth/verify?token=...`
- Login: `POST /api/auth/login`
- Current account: `GET /api/auth/me`
- Public approved reviews: `GET /api/apps/{app_id}/reviews`
- Authenticated review: `POST /api/apps/{app_id}/reviews`
- Report: `POST /api/reviews/{review_id}/report?reason=...`

## Automated moderation

- Publish only when automated safety moderation explicitly returns safe.
- Reject unsafe content and excessive external links.
- Hold uncertain, unavailable or insufficient-content cases for exception review.
- Do not reject a review merely because it is negative.
- Only approved reviews contribute to public aggregates.
- Administrator access is never granted through public registration.

## Security and operations

Passwords use scrypt; email verification is required; access tokens expire after 30 minutes. Redis-backed limits are applied to registration, login, verification and review routes. Production startup fails if PostgreSQL, Redis, JWT, SMTP or AI moderation configuration is missing. Redis failure in production fails closed for rate-limited routes.

Admin access is assigned only through controlled database operations. Before launch, validate email deliverability, configure monitoring and backup restore drills, and perform the complete end-to-end tests. This repository configuration does not itself deploy a server or supply third-party credentials.
