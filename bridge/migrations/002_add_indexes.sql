-- Migration: Add Indexes and Unique Constraints
-- Date: 2025-12-08
-- Run this in Supabase SQL Editor

BEGIN;

-- trades indexes
CREATE INDEX IF NOT EXISTS idx_trades_participant_close_time 
  ON public.trades(participant_id, close_time DESC);

-- เช็คว่ามี unique constraint หรือยัง ก่อนเพิ่ม
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trades_participant_position_unique'
  ) THEN
    ALTER TABLE public.trades 
    ADD CONSTRAINT trades_participant_position_unique 
    UNIQUE (participant_id, position_id);
  END IF;
END $$;

-- equity_snapshots indexes
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_participant_time 
  ON public.equity_snapshots(participant_id, timestamp DESC);

-- daily_stats indexes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_stats_participant_date_unique'
  ) THEN
    ALTER TABLE public.daily_stats 
    ADD CONSTRAINT daily_stats_participant_date_unique 
    UNIQUE (participant_id, date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_stats_date_points 
  ON public.daily_stats(date, points DESC, profit DESC);

COMMIT;
