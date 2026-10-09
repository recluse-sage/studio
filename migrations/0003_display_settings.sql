-- Oasis.dev migration 0003: display_settings single row table.
-- Additive only. Proof stays hidden by default.
-- Admin GET and PUT plus public GET use { proofVisible: boolean }.
-- No seed proof. No data rewrite.

CREATE TABLE IF NOT EXISTS display_settings (
  id TEXT PRIMARY KEY CHECK (id = 'primary'),
  proof_visible INTEGER NOT NULL DEFAULT 0 CHECK (proof_visible IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO display_settings (id, proof_visible, created_at, updated_at)
VALUES ('primary', 0, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z');
