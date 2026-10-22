-- Oasis.dev migration 0005: posts kind split for Know-how.
-- Additive only. No seed data. No rewrite.
-- kind values: post is a short studio note, know-how is a practical guide.
-- The API and UI spell the guide kind know-how with a hyphen. The database
-- also accepts knowhow without a hyphen as an input alias, so both spellings
-- stay valid in the check. Missing kind defaults to post, which keeps old
-- rows and the designer UI working without changes.

ALTER TABLE posts ADD COLUMN kind TEXT NOT NULL DEFAULT 'post' CHECK (kind IN ('post', 'knowhow', 'know-how'));

CREATE INDEX IF NOT EXISTS idx_posts_kind_status ON posts(kind, status);
