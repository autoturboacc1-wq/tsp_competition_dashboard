# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "supabase>=2.0.0",
#     "python-dotenv>=1.0.0",
# ]
# ///
"""Quick script to check participant data in Supabase."""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

PARTICIPANT_ID = "f2a8a2ea-df5c-488f-b1ef-d5e0419b5583"

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

supabase = create_client(url, key)

# --- Latest daily_stats row ---
print("=" * 60)
print(f"LATEST daily_stats for {PARTICIPANT_ID}")
print("=" * 60)

stats_res = (
    supabase.table("daily_stats")
    .select("*")
    .eq("participant_id", PARTICIPANT_ID)
    .order("date", desc=True)
    .limit(1)
    .execute()
)

if stats_res.data:
    for k, v in stats_res.data[0].items():
        print(f"  {k}: {v}")
else:
    print("  No daily_stats found.")

# --- Last 10 closed trades ---
print()
print("=" * 60)
print(f"LAST 10 CLOSED TRADES for {PARTICIPANT_ID}")
print("=" * 60)

trades_res = (
    supabase.table("trades")
    .select("*")
    .eq("participant_id", PARTICIPANT_ID)
    .filter("close_time", "not.is", "null")
    .order("close_time", desc=True)
    .limit(10)
    .execute()
)

if trades_res.data:
    total_profit = 0.0
    for i, t in enumerate(trades_res.data, 1):
        profit = t.get("profit", 0) or 0
        total_profit += float(profit)
        print(f"\n  Trade #{i}")
        for k, v in t.items():
            print(f"    {k}: {v}")
    print(f"\n  Sum of last 10 trades profit: {total_profit:.2f}")
else:
    print("  No closed trades found.")

# --- Total profit from ALL closed trades ---
print()
print("=" * 60)
print("TOTAL PROFIT (all closed trades)")
print("=" * 60)

all_trades = (
    supabase.table("trades")
    .select("profit")
    .eq("participant_id", PARTICIPANT_ID)
    .filter("close_time", "not.is", "null")
    .execute()
)

if all_trades.data:
    grand_total = sum(float(t.get("profit", 0) or 0) for t in all_trades.data)
    print(f"  Closed trades count: {len(all_trades.data)}")
    print(f"  Total profit: {grand_total:.2f}")
else:
    print("  No closed trades found.")
