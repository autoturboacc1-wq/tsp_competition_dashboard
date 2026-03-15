-- Migration: Add Performance Indexes
-- Date: 2026-03-09
-- Run this in Supabase SQL Editor

BEGIN;

-- For get_peak_equity: sort by equity value
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_participant_equity
  ON public.equity_snapshots(participant_id, equity DESC);

-- For latest-per-participant queries (homepage, admin dedup)
CREATE INDEX IF NOT EXISTS idx_daily_stats_participant_date
  ON public.daily_stats(participant_id, date DESC);

COMMIT;
