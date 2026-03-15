import MetaTrader5 as mt5
from datetime import datetime, timezone, timedelta
from core import get_supabase_client, load_env
from tz_config import THAILAND_TZ

# Load environment variables
load_env()

# Initialize Supabase client (singleton from core)
supabase = get_supabase_client()

# Timeframe configuration: (MT5 timeframe, retention days, candle count to fetch)
# Candle counts are small for periodic sync (upsert handles duplicates)
TIMEFRAMES = {
    'M1': (mt5.TIMEFRAME_M1, 3, 60),        # last 1 hour
    'M5': (mt5.TIMEFRAME_M5, 14, 60),       # last 5 hours
    'M15': (mt5.TIMEFRAME_M15, 30, 60),     # last 15 hours
    'H1': (mt5.TIMEFRAME_H1, 90, 48),       # last 2 days
    'H4': (mt5.TIMEFRAME_H4, 180, 48),      # last 8 days
    'D1': (mt5.TIMEFRAME_D1, None, 30),     # last 1 month
}

# Full backfill counts (used once on first run)
BACKFILL_COUNTS = {
    'M1': 4320,    # 3 days
    'M5': 4032,    # 14 days
    'M15': 2880,   # 30 days
    'H1': 2160,    # 90 days
    'H4': 1080,    # 180 days
    'D1': 365,     # 1 year
}

_backfill_done = False

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
    """Sync all timeframes for XAUUSD. First call does full backfill, subsequent calls fetch recent only."""
    global _backfill_done

    symbol = get_symbol()
    if not symbol:
        print("[Market Data] Failed to select any gold symbol")
        return

    is_backfill = not _backfill_done
    if is_backfill:
        print(f"[Market Data] Backfilling {symbol} (first run)...")
    else:
        print(f"[Market Data] Syncing {symbol}...")

    total_candles = 0
    for tf_name, (mt5_tf, _, count) in TIMEFRAMES.items():
        # Use larger count for first-time backfill
        fetch_count = BACKFILL_COUNTS[tf_name] if is_backfill else count
        synced = sync_timeframe(symbol, tf_name, mt5_tf, fetch_count)
        if synced > 0:
            total_candles += synced

    print(f"[Market Data] {total_candles} candles synced")
    _backfill_done = True

    # Cleanup old data once per cycle
    cleanup_old_data()
