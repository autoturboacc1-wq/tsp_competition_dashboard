import os
import random
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

def generate_mock_candles(symbol, start_time, end_time, timeframe_minutes=15):
    current_time = start_time
    candles = []
    price = 2000.0
    
    while current_time <= end_time:
        open_price = price
        close_price = price + random.uniform(-2, 2)
        high_price = max(open_price, close_price) + random.uniform(0, 1)
        low_price = min(open_price, close_price) - random.uniform(0, 1)
        
        candles.append({
            "symbol": symbol,
            "time": current_time.isoformat(),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2),
            "volume": int(random.uniform(100, 1000))
        })
        
        price = close_price
        current_time += timedelta(minutes=timeframe_minutes)
        
    return candles

# Target Trade Time: 2025-12-04T16:49:36+00:00
# We'll generate data for the whole day of 2025-12-04
start = datetime.fromisoformat("2025-12-04T00:00:00+00:00")
end = datetime.fromisoformat("2025-12-04T23:59:59+00:00")

print(f"Generating mock data for {start} to {end}...")
mock_data = generate_mock_candles("XAUUSD", start, end)
print(f"Generated {len(mock_data)} candles.")

# Insert into Supabase
batch_size = 100
for i in range(0, len(mock_data), batch_size):
    batch = mock_data[i:i+batch_size]
    data, count = supabase.table('market_data').upsert(batch).execute()
    print(f"Inserted batch {i//batch_size + 1}")

print("Mock data insertion complete.")
