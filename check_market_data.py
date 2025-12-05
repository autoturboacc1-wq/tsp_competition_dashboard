import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv("bridge/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    # Check count
    response = supabase.table('market_data').select('count', count='exact').execute()
    print(f"Total rows in market_data: {response.count}")

    # Check XAUUSD specific
    response = supabase.table('market_data').select('time').eq('symbol', 'XAUUSD').order('time', desc=True).limit(5).execute()
    print("\nLatest 5 XAUUSD candles:")
    for row in response.data:
        print(f"Time: {row['time']}")

    response = supabase.table('market_data').select('time').eq('symbol', 'XAUUSD').order('time', desc=False).limit(1).execute()
    if response.data:
        print(f"\nOldest XAUUSD candle: {response.data[0]['time']}")

except Exception as e:
    print(f"Error: {e}")
