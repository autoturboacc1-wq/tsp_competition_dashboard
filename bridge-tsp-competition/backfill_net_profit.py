# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "supabase",
#     "python-dotenv",
# ]
# ///
"""
Backfill historical daily_stats.profit from trades table.

After fixing the net PNL calculation (adding commission + swap),
the trades table will have correct profit values after re-running the bridge.
This script recalculates cumulative profit for each historical daily_stats row
based on trades closed up to that date.

Usage:
    1. Run the bridge first (to upsert trades with correct net profit)
    2. Then run: uv run backfill_net_profit.py
"""

import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def backfill():
    # Get all participants
    participants = supabase.table('participants').select('id, nickname').execute().data
    if not participants:
        print("No participants found")
        return

    for p in participants:
        pid = p['id']
        nickname = p['nickname']
        print(f"\n--- {nickname} ---")

        # Get all trades for this participant (sorted by close_time)
        trades = []
        offset = 0
        batch_size = 1000
        while True:
            batch = supabase.table('trades') \
                .select('profit, close_time') \
                .eq('participant_id', pid) \
                .filter('close_time', 'not.is', 'null') \
                .order('close_time', desc=False) \
                .range(offset, offset + batch_size - 1) \
                .execute().data
            if not batch:
                break
            trades.extend(batch)
            if len(batch) < batch_size:
                break
            offset += batch_size

        if not trades:
            print(f"  No trades found, skipping")
            continue

        # Get all daily_stats rows for this participant
        stats_rows = []
        offset = 0
        while True:
            batch = supabase.table('daily_stats') \
                .select('date, profit') \
                .eq('participant_id', pid) \
                .order('date', desc=False) \
                .range(offset, offset + batch_size - 1) \
                .execute().data
            if not batch:
                break
            stats_rows.extend(batch)
            if len(batch) < batch_size:
                break
            offset += batch_size

        if not stats_rows:
            print(f"  No daily_stats found, skipping")
            continue

        # For each daily_stats date, sum all trades closed on or before that date (Thai time)
        updates = []
        for row in stats_rows:
            date_str = row['date']  # e.g. "2026-03-15"
            # End of day in Thai time = start of next day
            end_of_day = datetime.fromisoformat(date_str) + timedelta(days=1)
            end_of_day_str = end_of_day.isoformat()

            cumulative_profit = sum(
                t['profit'] for t in trades
                if t['close_time'] < end_of_day_str
            )
            cumulative_profit = round(cumulative_profit, 2)

            if abs(cumulative_profit - (row['profit'] or 0)) > 0.01:
                updates.append({
                    'date': date_str,
                    'old_profit': row['profit'],
                    'new_profit': cumulative_profit
                })

        if not updates:
            print(f"  All {len(stats_rows)} rows already correct")
            continue

        print(f"  Updating {len(updates)}/{len(stats_rows)} rows")
        for u in updates:
            supabase.table('daily_stats') \
                .update({'profit': u['new_profit']}) \
                .eq('participant_id', pid) \
                .eq('date', u['date']) \
                .execute()
            print(f"    {u['date']}: {u['old_profit']} -> {u['new_profit']}")

    print("\nBackfill complete!")

if __name__ == '__main__':
    backfill()
