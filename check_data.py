import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    # Try VITE env vars if standard ones aren't set
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY")

print(f"URL: {url}")
# print(f"Key: {key}") # Don't print key

supabase: Client = create_client(url, key)

# Check Trades
print("\n--- Latest Trade ---")
response = supabase.table('trades').select("*").limit(1).execute()
if response.data:
    trade = response.data[0]
    print(f"Symbol: {trade.get('symbol')}")
    print(f"Open Time: {trade.get('open_time')}")
    print(f"Close Time: {trade.get('close_time')}")
    
    # Check Market Data for this trade
    print("\n--- Market Data Check ---")
    # Just check if ANY market data exists for this symbol
    md_response = supabase.table('market_data').select("time, close").eq('symbol', trade.get('symbol')).limit(5).execute()
    print(f"Market Data Count: {len(md_response.data)}")
    print(f"Sample: {md_response.data}")
else:
    print("No trades found.")
