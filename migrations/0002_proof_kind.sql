-- Oasis.dev migration 0002: proof_notes kind.
-- Additive only. Existing rows default to ops-note. No data rewrite.
-- Kind values: proof is approved real client proof, sample-concept is a
-- clearly labeled demo, ops-note is an internal owner note, backup-drill
-- logs a restore test date.

ALTER TABLE proof_notes ADD COLUMN kind TEXT NOT NULL DEFAULT 'ops-note' CHECK (kind IN ('proof', 'sample-concept', 'ops-note', 'backup-drill'));

CREATE INDEX IF NOT EXISTS idx_proof_kind_created ON proof_notes(kind, created_at DESC);
