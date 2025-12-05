import time
import MetaTrader5 as mt5
from datetime import datetime, timezone
from core import init_mt5, get_supabase_client, load_env, send_telegram_message
import os

# Load environment variables
load_env()

SYNC_INTERVAL = int(os.getenv("MARKET_DATA_SYNC_INTERVAL", "60")) # Default 60 seconds

# Initialize Supabase client
supabase = get_supabase_client()

def sync_market_data():
    """Fetch M15 candles for XAUUSD and sync to Supabase"""
    symbol = "XAUUSD"
    timeframe = mt5.TIMEFRAME_M15
    count = 1000 # Last 1000 candles
    
    # Try multiple symbol variants
    symbols_to_try = ["XAUUSD", "XAUUSD.s", "GOLD"]
    selected_symbol = None

    for s in symbols_to_try:
        if mt5.symbol_select(s, True):
            selected_symbol = s
            break
    
    if not selected_symbol:
        print(f"Failed to select any of: {symbols_to_try}")
        return

    # Use the selected symbol for fetching data
    rates = mt5.copy_rates_from_pos(selected_symbol, timeframe, 0, count)
    if rates is None:
        print(f"Failed to copy rates for {selected_symbol}, error: {mt5.last_error()}")
        return

    market_data = []
    for rate in rates:
        # Convert timestamp to UTC
        # MT5 time is usually server time (often UTC+2 or UTC+3). 
        # Assuming UTC+3 for now based on previous scripts, but ideally should be configurable.
        # Adjusting UTC+3 to UTC by subtracting 10800 seconds (3 hours)
        dt = datetime.fromtimestamp(rate['time'] - 10800, tz=timezone.utc) 
        
        market_data.append({
            "symbol": "XAUUSD", # Always save as normalized XAUUSD in DB
            "time": dt.isoformat(),
            "open": float(rate['open']),
            "high": float(rate['high']),
            "low": float(rate['low']),
            "close": float(rate['close']),
            "volume": int(rate['tick_volume'])
        })
    
    if market_data:
        try:
            # Upsert to Supabase
            data, count = supabase.table('market_data').upsert(market_data, on_conflict='symbol,time').execute()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Synced {len(market_data)} candles for {symbol}")
        except Exception as e:
            print(f"Error syncing market data: {e}")

def main():
    if not init_mt5():
        return

    print(f"🚀 Market Data Service Started! (Sync Interval: {SYNC_INTERVAL}s)")
    send_telegram_message(f"🚀 Market Data Service Started!\nSync Interval: {SYNC_INTERVAL}s")
    
    while True:
        try:
            sync_market_data()
        except Exception as e:
            print(f"Critical Error in loop: {e}")
            send_telegram_message(f"⚠️ Market Data Service Error:\n{e}")
        
        time.sleep(SYNC_INTERVAL)

    mt5.shutdown()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopping Market Data Service...")
        mt5.shutdown()
