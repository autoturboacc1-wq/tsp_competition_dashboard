-- Push notification subscriptions for PWA
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint text NOT NULL UNIQUE,
    keys jsonb NOT NULL,
    participant_id uuid REFERENCES participants(id),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_participant ON push_subscriptions(participant_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert on push_subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on push_subscriptions" ON push_subscriptions FOR DELETE USING (true);
