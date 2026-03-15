-- Competition rounds/seasons
CREATE TABLE IF NOT EXISTS competitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
    rules jsonb,
    created_at timestamptz DEFAULT now()
);

-- Link existing tables to competitions
ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES competitions(id);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES competitions(id);

CREATE INDEX IF NOT EXISTS idx_daily_stats_competition ON daily_stats(competition_id);
CREATE INDEX IF NOT EXISTS idx_trades_competition ON trades(competition_id);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);

-- RLS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on competitions" ON competitions FOR SELECT USING (true);
