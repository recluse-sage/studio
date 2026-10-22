-- Oasis.dev migration 0004: posts scheduling.
-- Additive only. No seed data. No rewrite.
-- Status values: draft, scheduled, published, unpublished.
-- publish_at and published_at are canonical UTC YYYY-MM-DDTHH:mm:ss.sssZ or NULL.
-- GLOB checks enforce the canonical shape. Slug is lowercase alphanumerics plus hyphen only.

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug NOT GLOB '*[^a-z0-9-]*' AND length(slug) >= 2 AND length(slug) <= 60),
  title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 160),
  body TEXT CHECK (body IS NULL OR length(body) <= 20000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'unpublished')),
  publish_at TEXT CHECK (publish_at IS NULL OR (publish_at GLOB '????-??-??T??:??:??.???Z' AND length(publish_at) = 24)),
  published_at TEXT CHECK (published_at IS NULL OR (published_at GLOB '????-??-??T??:??:??.???Z' AND length(published_at) = 24)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_status_publish ON posts(status, publish_at);
