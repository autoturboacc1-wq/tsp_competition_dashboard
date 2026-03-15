import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

supabase: Client = create_client(url, key)

# Check market_data
print("Checking market_data table...")
try:
    # Get count
    count_response = supabase.table('market_data').select('*', count='exact').limit(1).execute()
    print(f"Total rows in market_data: {count_response.count}")

    # Get min/max time
    min_time_response = supabase.table('market_data').select('time').order('time', desc=False).limit(1).execute()
    max_time_response = supabase.table('market_data').select('time').order('time', desc=True).limit(1).execute()
    
    if min_time_response.data:
        print(f"Earliest candle: {min_time_response.data[0]['time']}")
    if max_time_response.data:
        print(f"Latest candle: {max_time_response.data[0]['time']}")

    # Check for specific symbol XAUUSD
    symbol_count = supabase.table('market_data').select('*', count='exact').eq('symbol', 'XAUUSD').limit(1).execute()
    print(f"Total XAUUSD rows: {symbol_count.count}")


except Exception as e:
    print(f"Error fetching market_data: {e}")
