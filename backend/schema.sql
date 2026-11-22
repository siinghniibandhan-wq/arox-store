CREATE TABLE IF NOT EXISTS users (
 id VARCHAR(36) PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE, password_hash VARCHAR(256) NOT NULL,
 is_verified BOOLEAN NOT NULL DEFAULT FALSE, is_admin BOOLEAN NOT NULL DEFAULT FALSE,
 verification_token_hash VARCHAR(64), verification_expires_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reviews (
 id VARCHAR(36) PRIMARY KEY, customer_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 app_id VARCHAR(100) NOT NULL, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
 title VARCHAR(120) NOT NULL, body TEXT NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 moderation_reason VARCHAR(80) NOT NULL DEFAULT 'pending_moderation',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT uq_review_customer_app UNIQUE(customer_id, app_id)
);
CREATE INDEX IF NOT EXISTS ix_reviews_public ON reviews(app_id, status, created_at DESC);
CREATE TABLE IF NOT EXISTS review_reports (
 id VARCHAR(36) PRIMARY KEY, review_id VARCHAR(36) NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
 reporter_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason VARCHAR(40) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
