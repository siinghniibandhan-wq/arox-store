# Arox Store reviews API — implementation contract

## Product decision
Customer reviews require an authenticated Arox Store account. Guest reviews are not accepted.

## Required API
- `GET /api/apps/{app_id}/reviews` — approved reviews, paginated; include aggregate average and count.
- `POST /api/apps/{app_id}/reviews` — authenticated customer only; body: `{ "rating": 1..5, "title": "...", "body": "..." }`.
- `PATCH /api/reviews/{review_id}` — customer may edit their own review within the moderation policy.
- `POST /api/reviews/{review_id}/report` — authenticated report with a reason.
- `GET /api/admin/reviews?status=pending` — admin-only moderation queue.
- `PATCH /api/admin/reviews/{review_id}` — admin-only approve/reject/remove action.

## Data and safeguards
- Store customer_id, app_id, rating, title, body, status, created_at, updated_at.
- Unique constraint on (customer_id, app_id): one current review per customer per app.
- Enforce 1–5 rating server-side, input length limits, HTML escaping, rate limiting and CSRF protection where cookie sessions are used.
- Default status is pending; only approved reviews contribute to public average/count.
- Do not trust client-supplied customer IDs, display names, rating aggregates or moderation status.
- Provide abuse reporting and an auditable moderation trail.
- Never store passwords in plaintext. Use the selected identity provider or secure password hashing and short-lived sessions.

## Current limitation
Arox Store is hosted as a static GitHub Pages site. It has no review API or customer-account backend today. The frontend therefore displays the sign-in requirement and clearly marks submissions as unavailable; it does not fabricate reviews, persist ratings in localStorage, or imply that review submission works.

## Hosting decision required before activation
Deploy the API and identity service on a trusted backend host, configure HTTPS and CORS for `https://siinghniibandhan-wq.github.io`, then configure the frontend API base URL. Do not use either listed application backend as the review database without a separate security and data-ownership review.
