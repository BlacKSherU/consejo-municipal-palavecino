-- Admin
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_record TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Editable "Quiénes somos" and similar
CREATE TABLE site_content (
  key TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO site_content (key, body) VALUES ('about', '# Quiénes somos\n\nEdite este texto desde el panel de administración.');

-- News
CREATE TABLE news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_news_published ON news (published, published_at DESC);

-- Council
CREATE TABLE council_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE council_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position_id INTEGER NOT NULL REFERENCES council_positions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  photo_key TEXT,
  email TEXT,
  phone TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_members_position ON council_members (position_id, sort_order);

-- Gazettes (official PDFs)
CREATE TABLE gazettes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  issue_number TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime TEXT NOT NULL DEFAULT 'application/pdf',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_gazettes_published ON gazettes (published_at DESC);

-- Instagram cache (single row id=1)
CREATE TABLE instagram_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL DEFAULT '[]',
  error TEXT,
  fetched_at TEXT
);

INSERT INTO instagram_cache (id, payload, fetched_at) VALUES (1, '[]', NULL);
