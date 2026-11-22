# Arox Store customer accounts and reviews

## Implemented API contract (initial backend)

The independent FastAPI service lives in `backend/`. It is designed to use PostgreSQL and is not deployed yet.

### Customer identity
- `POST /api/auth/register` — creates an unverified account and sends a one-hour email verification link.
- `POST /api/auth/verify?token=...` — verifies the email address.
- `POST /api/auth/login` — returns a short-lived bearer JWT for verified customers.
- `GET /api/auth/me` — returns the authenticated customer profile.

Passwords are stored as scrypt hashes. Public registration never grants administrator privileges.

### Reviews
- `GET /api/apps/{app_id}/reviews` — returns approved reviews and the approved-only average/count.
- `POST /api/apps/{app_id}/reviews` — requires a verified customer; one review per customer per app.
- `POST /api/reviews/{review_id}/report` — allows authenticated customers to report a published review.
- `GET /api/admin/reviews` — administrator-only queue for uncertain reviews.
- `PATCH /api/admin/reviews/{review_id}?action=approve|reject` — administrator-only exception handling.

### Automated moderation policy
1. Deterministic checks reject excessive external links and hold insufficient content.
2. The configured AI moderation endpoint checks submitted text.
3. Clear safe results are automatically published.
4. Unsafe results are rejected.
5. Unavailable or uncertain results are held for an administrator.
6. Negative opinions are not rejected solely for being negative.
7. Only approved reviews contribute to public rating aggregates.

The moderation integration currently uses the OpenAI moderation endpoint. A missing API key or moderation service failure fails closed to the pending queue; it does not silently publish.

## Production requirements still outstanding
- Deploy the API with HTTPS and PostgreSQL.
- Configure SMTP, a strong unique JWT secret, AI moderation credentials and the correct GitHub Pages frontend origin/URL.
- Add gateway-level rate limiting, monitoring, database backups and operational alerting.
- Configure the frontend API base URL and implement the sign-in/register/review forms.
- Create the first administrator through a controlled database operation.

GitHub Pages alone cannot host the API or securely persist customer accounts and reviews. Until the API is deployed and the frontend is connected, customer login and review submission remain unavailable on the public site.
