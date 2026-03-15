-- Migration: Add Equity Snapshots Table for MyFxBook-style Equity Curve
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create equity_snapshots table
-- ============================================
CREATE TABLE IF NOT EXISTS public.equity_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  balance numeric NOT NULL,
  equity numeric NOT NULL,
  floating_pl numeric DEFAULT 0,
  margin_level numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate snapshots for same participant at same time
  UNIQUE(participant_id, timestamp)
);

-- ============================================
-- 2. Add indexes for efficient querying
-- ============================================
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_participant_time 
  ON public.equity_snapshots (participant_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_equity_snapshots_timestamp 
  ON public.equity_snapshots (timestamp);

-- ============================================
-- 3. Enable RLS and add public read policy
-- ============================================
ALTER TABLE public.equity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on equity_snapshots"
  ON public.equity_snapshots FOR SELECT USING (true);

-- ============================================
-- 4. Add missing columns to daily_stats
-- ============================================
ALTER TABLE public.daily_stats 
  ADD COLUMN IF NOT EXISTS floating_pl numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_lots numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equity_growth_percent numeric DEFAULT 0;

-- ============================================
-- 5. Verify the changes
-- ============================================
SELECT 
    table_name,
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('equity_snapshots', 'daily_stats')
ORDER BY 
    table_name, ordinal_position;
