import time
import MetaTrader5 as mt5
from datetime import datetime, timezone, timedelta
from core import init_mt5, get_supabase_client, load_env, send_telegram_message
import os

# Load environment variables
load_env()

SYNC_INTERVAL = int(os.getenv("MARKET_DATA_SYNC_INTERVAL", "60"))  # Default 60 seconds

# Initialize Supabase client
supabase = get_supabase_client()

# Timeframe configuration: (MT5 timeframe, retention days, candle count to fetch)
TIMEFRAMES = {
    'M1': (mt5.TIMEFRAME_M1, 3, 4320),      # 3 days = 4320 candles
    'M5': (mt5.TIMEFRAME_M5, 14, 4032),     # 14 days = 4032 candles
    'M15': (mt5.TIMEFRAME_M15, 30, 2880),   # 30 days = 2880 candles
    'H1': (mt5.TIMEFRAME_H1, 90, 2160),     # 90 days = 2160 candles
    'H4': (mt5.TIMEFRAME_H4, 180, 1080),    # 180 days = 1080 candles
    'D1': (mt5.TIMEFRAME_D1, None, 365),    # Forever, 1 year of data
}

def get_symbol():
    """Try multiple symbol variants and return the first available one"""
    symbols_to_try = ["XAUUSD", "XAUUSD.s", "GOLD"]
    for s in symbols_to_try:
        if mt5.symbol_select(s, True):
            return s
    return None

def sync_timeframe(symbol: str, tf_name: str, mt5_tf: int, count: int):
    """Sync a specific timeframe to Supabase"""
    rates = mt5.copy_rates_from_pos(symbol, mt5_tf, 0, count)
    if rates is None:
        print(f"  ❌ Failed to copy {tf_name} rates: {mt5.last_error()}")
        return 0
    
    market_data = []
    for rate in rates:
        # Convert MT5 server time (UTC+3) to UTC
        dt = datetime.fromtimestamp(rate['time'] - 10800, tz=timezone.utc)
        
        market_data.append({
            "symbol": "XAUUSD",  # Normalized symbol
            "timeframe": tf_name,
            "time": dt.isoformat(),
            "open": float(rate['open']),
            "high": float(rate['high']),
            "low": float(rate['low']),
            "close": float(rate['close']),
            "volume": int(rate['tick_volume'])
        })
    
    if market_data:
        try:
            supabase.table('market_data').upsert(
                market_data, 
                on_conflict='symbol,time,timeframe'
            ).execute()
            return len(market_data)
        except Exception as e:
            print(f"  ❌ Error syncing {tf_name}: {e}")
            return 0
    return 0

def cleanup_old_data():
    """Delete old data based on retention policy"""
    now = datetime.now(timezone.utc)
    
    for tf_name, (_, retention_days, _) in TIMEFRAMES.items():
        if retention_days is None:
            continue  # No retention limit
        
        cutoff = now - timedelta(days=retention_days)
        try:
            result = supabase.table('market_data').delete().eq(
                'timeframe', tf_name
            ).lt('time', cutoff.isoformat()).execute()
            
            # Check if any rows were deleted
            if result.data and len(result.data) > 0:
                print(f"  🗑️ Cleaned up {len(result.data)} old {tf_name} candles")
        except Exception as e:
            print(f"  ❌ Error cleaning {tf_name}: {e}")

def sync_market_data():
    """Sync all timeframes for XAUUSD"""
    symbol = get_symbol()
    if not symbol:
        print("❌ Failed to select any gold symbol")
        return
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Syncing {symbol}...")
    
    total_candles = 0
    for tf_name, (mt5_tf, _, count) in TIMEFRAMES.items():
        synced = sync_timeframe(symbol, tf_name, mt5_tf, count)
        if synced > 0:
            print(f"  ✅ {tf_name}: {synced} candles")
            total_candles += synced
    
    print(f"  📊 Total: {total_candles} candles synced")
    
    # Cleanup old data every sync
    cleanup_old_data()

def main():
    if not init_mt5():
        return

    print(f"🚀 Market Data Service Started!")
    print(f"   Sync Interval: {SYNC_INTERVAL}s")
    print(f"   Timeframes: {', '.join(TIMEFRAMES.keys())}")
    send_telegram_message(
        f"🚀 Market Data Service Started!\n"
        f"Sync Interval: {SYNC_INTERVAL}s\n"
        f"Timeframes: {', '.join(TIMEFRAMES.keys())}"
    )
    
    while True:
        try:
            sync_market_data()
        except Exception as e:
            print(f"❌ Critical Error: {e}")
            send_telegram_message(f"⚠️ Market Data Service Error:\n{e}")
        
        time.sleep(SYNC_INTERVAL)

    mt5.shutdown()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Stopping Market Data Service...")
        mt5.shutdown()
