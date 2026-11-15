CREATE TABLE users (
  id UUID PRIMARY KEY,
  email_normalized VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX users_last_active_at_idx ON users(last_active_at);

CREATE TABLE sessions (
  id_hash BYTEA PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
  authenticated_at TIMESTAMPTZ
);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);

CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, provider, provider_id)
);
CREATE INDEX favorites_page_idx ON favorites(user_id, created_at DESC, provider, provider_id);

CREATE TABLE verification_tokens (
  token_hash BYTEA PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
  consumed_at TIMESTAMPTZ
);
CREATE INDEX verification_tokens_user_expiry_idx ON verification_tokens(user_id, expires_at);

CREATE TABLE password_reset_tokens (
  token_hash BYTEA PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
  consumed_at TIMESTAMPTZ
);
CREATE INDEX password_reset_tokens_user_expiry_idx ON password_reset_tokens(user_id, expires_at);
