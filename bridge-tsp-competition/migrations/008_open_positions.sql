-- Live open positions for dashboard sentiment
CREATE TABLE IF NOT EXISTS public.open_positions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
    position_id bigint NOT NULL,
    symbol text NOT NULL,
    type text NOT NULL,
    lot_size numeric NOT NULL,
    open_price numeric NOT NULL,
    open_time timestamptz NOT NULL,
    sl numeric,
    tp numeric,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participant_id, position_id)
);

ALTER TABLE public.open_positions
    ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.competitions(id);

ALTER TABLE public.open_positions
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.open_positions'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) = 'UNIQUE (participant_id, position_id)'
    ) THEN
        ALTER TABLE public.open_positions
        ADD CONSTRAINT open_positions_participant_position_unique
        UNIQUE (participant_id, position_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_open_positions_participant
    ON public.open_positions(participant_id);

CREATE INDEX IF NOT EXISTS idx_open_positions_symbol
    ON public.open_positions(symbol);

CREATE INDEX IF NOT EXISTS idx_open_positions_updated_at
    ON public.open_positions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_open_positions_competition
    ON public.open_positions(competition_id);

ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'open_positions'
          AND policyname = 'Allow public read access on open_positions'
    ) THEN
        CREATE POLICY "Allow public read access on open_positions"
            ON public.open_positions
            FOR SELECT
            USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.open_positions;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN undefined_object THEN NULL;
        END;
    END IF;
END $$;
