CREATE TABLE IF NOT EXISTS events (
 id text PRIMARY KEY, slug text UNIQUE NOT NULL, admin_hash text UNIQUE NOT NULL,
 name text NOT NULL, organizer text NOT NULL, description text NOT NULL DEFAULT '', type text NOT NULL,
 min_value integer NOT NULL DEFAULT 0, max_value integer NOT NULL DEFAULT 0,
 exchange_at timestamptz NOT NULL, deadline timestamptz NOT NULL, location text NOT NULL DEFAULT '',
 closed boolean NOT NULL DEFAULT false, ended boolean NOT NULL DEFAULT false,
 drawn_at timestamptz, version integer NOT NULL DEFAULT 0, team_count integer NOT NULL DEFAULT 2,
 winner_count integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS participants (
 id text PRIMARY KEY, event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 name text NOT NULL, email text, phone text, preference text NOT NULL, gifts jsonb NOT NULL DEFAULT '[]',
 notes text NOT NULL DEFAULT '', wishes text NOT NULL DEFAULT '', nonce text NOT NULL, result text,
 delivery text NOT NULL DEFAULT 'PENDING', lease_until timestamptz, viewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS participant_event_email ON participants(event_id,email);
CREATE UNIQUE INDEX IF NOT EXISTS participant_event_phone ON participants(event_id,phone);
CREATE INDEX IF NOT EXISTS participant_event ON participants(event_id);
CREATE TABLE IF NOT EXISTS exclusions (
 id text PRIMARY KEY, event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 a text NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
 b text NOT NULL REFERENCES participants(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS exclusion_pair ON exclusions(event_id,a,b);
CREATE TABLE IF NOT EXISTS locks (id text PRIMARY KEY);
INSERT INTO locks(id) VALUES ('email') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS email_attempts (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS email_time ON email_attempts(created_at);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
