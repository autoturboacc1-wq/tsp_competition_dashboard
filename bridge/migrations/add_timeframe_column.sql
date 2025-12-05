-- Migration: Add timeframe column to market_data table
-- Run this in Supabase SQL Editor

-- Step 1: Add timeframe column with default 'M15' for existing data
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS timeframe TEXT DEFAULT 'M15';

-- Step 2: Drop existing primary key constraint
ALTER TABLE market_data DROP CONSTRAINT IF EXISTS market_data_pkey;

-- Step 3: Create new composite primary key including timeframe
ALTER TABLE market_data ADD PRIMARY KEY (symbol, time, timeframe);

-- Step 4: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_market_data_timeframe ON market_data (timeframe);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timeframe ON market_data (symbol, timeframe);

-- Step 5: Verify the changes
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'market_data';
