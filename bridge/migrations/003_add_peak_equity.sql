-- Migration: Add peak_equity column to daily_stats
-- This preserves the all-time peak equity even after old equity_snapshots
-- are cleaned up (30-day retention), ensuring Max DD calculation remains
-- accurate over the full competition period.
--
-- Run this in Supabase SQL Editor

ALTER TABLE public.daily_stats
  ADD COLUMN IF NOT EXISTS peak_equity numeric DEFAULT 0;
