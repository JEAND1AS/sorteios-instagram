ALTER TABLE participants ADD COLUMN IF NOT EXISTS access_code_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS participant_event_access_code ON participants(event_id, access_code_hash);
