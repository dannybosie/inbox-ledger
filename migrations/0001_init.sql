CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  time INTEGER NOT NULL,            -- epoch ms
  amount INTEGER,                   -- VND; NULL while a foreign amount has no rate
  direction TEXT NOT NULL,          -- out | in
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  person TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,             -- a parser id, or manual | import
  source_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX transactions_time ON transactions(time);
CREATE INDEX transactions_category ON transactions(category);
CREATE UNIQUE INDEX transactions_source_id ON transactions(source_id) WHERE source_id != '';

CREATE TABLE categories (
  name TEXT PRIMARY KEY,
  position INTEGER NOT NULL
);

CREATE TABLE rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Who signs in (email), the name shown for them, and which member role (PRIMARY/PARTNER) their bank emails are filed under.
CREATE TABLE people (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT ''
);

-- Log of received emails: shows which were skipped or failed, and holds Gmail's forwarding confirmation code.
CREATE TABLE email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at INTEGER NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,             -- saved | duplicate | ignored | error | confirmation
  detail TEXT NOT NULL DEFAULT ''
);
