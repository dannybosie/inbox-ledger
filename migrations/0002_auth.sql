-- Sign-in with a 6-digit emailed code; sessions last a year.
CREATE TABLE login_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX sessions_email ON sessions(email);
