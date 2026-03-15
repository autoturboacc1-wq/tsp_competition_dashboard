"""
Equity Snapshot Service - MyFxBook-style equity data recording

Features:
- Records equity snapshots every 5 minutes
- Calculates floating P/L and margin level
- Implements 30-day retention policy for detailed snapshots
"""

import os
from datetime import datetime, timezone, timedelta
from core import get_supabase_client, load_env
from tz_config import THAILAND_TZ

# Load environment variables
load_env()

# Configuration
SNAPSHOT_INTERVAL_MINUTES = 5  # Record snapshot every 5 minutes
RETENTION_DAYS = 30  # Keep detailed snapshots for 30 days

# Initialize Supabase client
supabase = get_supabase_client()


def should_record_snapshot(participant_id: str) -> bool:
    """
    Check if enough time has passed since last snapshot (5 minutes).
    Returns True if we should record a new snapshot.
    """
    try:
        # Get latest snapshot for this participant
        response = supabase.table('equity_snapshots') \
            .select('timestamp') \
            .eq('participant_id', participant_id) \
            .order('timestamp', desc=True) \
            .limit(1) \
            .execute()
        
        if not response.data:
            return True  # No previous snapshot, record one
        
        last_timestamp = datetime.fromisoformat(response.data[0]['timestamp'].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        
        # Check if 5 minutes have passed
        return (now - last_timestamp) >= timedelta(minutes=SNAPSHOT_INTERVAL_MINUTES)
    
    except Exception as e:
        print(f"Error checking snapshot timing: {e}")
        return True  # On error, allow recording


def record_equity_snapshot(participant_id: str, account_info) -> bool:
    """
    Record an equity snapshot to the database.
    
    Args:
        participant_id: UUID of the participant
        account_info: MT5 account_info object
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Calculate floating P/L
        floating_pl = account_info.equity - account_info.balance
        
        # Round timestamp to nearest 5 minutes for cleaner data
        now = datetime.now(timezone.utc)
        rounded_minute = (now.minute // SNAPSHOT_INTERVAL_MINUTES) * SNAPSHOT_INTERVAL_MINUTES
        rounded_time = now.replace(minute=rounded_minute, second=0, microsecond=0)
        
        snapshot_data = {
            "participant_id": participant_id,
            "timestamp": rounded_time.isoformat(),
            "balance": float(account_info.balance),
            "equity": float(account_info.equity),
            "floating_pl": float(floating_pl),
            "margin_level": float(account_info.margin_level) if account_info.margin_level else None
        }
        
        # Upsert to handle potential duplicates
        supabase.table('equity_snapshots').upsert(
            snapshot_data, 
            on_conflict='participant_id,timestamp'
        ).execute()
        
        print(f"📊 Recorded equity snapshot: Balance=${account_info.balance:.2f}, Equity=${account_info.equity:.2f}")
        return True
        
    except Exception as e:
        print(f"❌ Error recording equity snapshot: {e}")
        return False


def get_previous_day_equity(participant_id: str) -> float:
    """
    Get the equity from the end of the previous day.
    Used to calculate equity growth percentage.
    """
    try:
        yesterday = (datetime.now(THAILAND_TZ) - timedelta(days=1)).date()
        
        # Get latest snapshot from yesterday
        response = supabase.table('equity_snapshots') \
            .select('equity') \
            .eq('participant_id', participant_id) \
            .gte('timestamp', yesterday.isoformat()) \
            .lt('timestamp', (datetime.now(THAILAND_TZ).date()).isoformat()) \
            .order('timestamp', desc=True) \
            .limit(1) \
            .execute()
        
        if response.data:
            return float(response.data[0]['equity'])
        
        # Fallback: check daily_stats
        response = supabase.table('daily_stats') \
            .select('equity') \
            .eq('participant_id', participant_id) \
            .eq('date', yesterday.isoformat()) \
            .limit(1) \
            .execute()
        
        if response.data:
            return float(response.data[0]['equity'])
        
        return 0  # No previous data
        
    except Exception as e:
        print(f"Error getting previous equity: {e}")
        return 0


def calculate_equity_growth(participant_id: str, current_equity: float) -> float:
    """
    Calculate the equity growth percentage compared to previous day.
    """
    previous_equity = get_previous_day_equity(participant_id)
    
    if previous_equity <= 0:
        return 0
    
    growth = ((current_equity - previous_equity) / previous_equity) * 100
    return round(growth, 2)


def cleanup_old_snapshots():
    """
    Delete snapshots older than RETENTION_DAYS.
    Called periodically to manage database size.
    """
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
        
        result = supabase.table('equity_snapshots') \
            .delete() \
            .lt('timestamp', cutoff.isoformat()) \
            .execute()
        
        if result.data:
            count = len(result.data)
            if count > 0:
                print(f"🗑️ Cleaned up {count} old equity snapshots (>{RETENTION_DAYS} days)")
        
    except Exception as e:
        print(f"❌ Error cleaning up old snapshots: {e}")


def get_equity_curve(participant_id: str, days: int = 30) -> list:
    """
    Get equity curve data for charting.
    
    Args:
        participant_id: UUID of the participant
        days: Number of days to fetch (default 30)
    
    Returns:
        List of {timestamp, equity, balance} objects
    """
    try:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        response = supabase.table('equity_snapshots') \
            .select('timestamp, balance, equity, floating_pl') \
            .eq('participant_id', participant_id) \
            .gte('timestamp', since.isoformat()) \
            .order('timestamp', desc=False) \
            .execute()
        
        return response.data or []
        
    except Exception as e:
        print(f"Error fetching equity curve: {e}")
        return []


def calculate_equity_metrics(participant_id: str, fallback_dd: float = 0.0) -> dict:
    """
    Calculate Max Drawdown and Peak Equity from equity curve in a single pass.
    Fetches snapshots once and computes both metrics together.

    Returns:
        dict with 'max_drawdown' (percentage) and 'peak_equity' (float)
    """
    try:
        # Single query: get all equity snapshots + stored peak from daily_stats
        response = supabase.table('equity_snapshots') \
            .select('equity, timestamp') \
            .eq('participant_id', participant_id) \
            .order('timestamp', desc=False) \
            .execute()

        snapshots = response.data or []

        # Get stored peak_equity from daily_stats (single query)
        peak_response = supabase.table('daily_stats') \
            .select('peak_equity') \
            .eq('participant_id', participant_id) \
            .not_.is_('peak_equity', 'null') \
            .order('date', desc=True) \
            .limit(1) \
            .execute()

        stored_peak = 0.0
        if peak_response.data and peak_response.data[0].get('peak_equity'):
            stored_peak = float(peak_response.data[0]['peak_equity'])

        if len(snapshots) < 2:
            print(f"⚠️ Max DD: Insufficient equity data ({len(snapshots)} snapshots), using fallback")
            return {'max_drawdown': fallback_dd, 'peak_equity': stored_peak}

        # Calculate both metrics in a single pass
        running_peak = max(float(snapshots[0]['equity']), stored_peak)
        overall_peak = running_peak
        max_dd = 0.0

        for snap in snapshots:
            eq = float(snap['equity'])
            if eq > running_peak:
                running_peak = eq
            if running_peak > overall_peak:
                overall_peak = running_peak
            if running_peak > 0:
                dd = ((running_peak - eq) / running_peak) * 100
                if dd > max_dd:
                    max_dd = dd

        return {
            'max_drawdown': round(max_dd, 2),
            'peak_equity': overall_peak
        }

    except Exception as e:
        print(f"❌ Error calculating equity metrics: {e}")
        return {'max_drawdown': fallback_dd, 'peak_equity': 0.0}


def calculate_max_drawdown_from_equity(participant_id: str, fallback_dd: float = 0.0) -> float:
    """Backward-compatible wrapper."""
    return calculate_equity_metrics(participant_id, fallback_dd)['max_drawdown']


def get_peak_equity(participant_id: str) -> float:
    """Backward-compatible wrapper."""
    return calculate_equity_metrics(participant_id)['peak_equity']


def calculate_total_lots(positions: dict) -> float:
    """
    Calculate total lots traded from positions dictionary.
    
    Args:
        positions: Dictionary of position data from sync_participant
    
    Returns:
        Total lots as float
    """
    total = 0
    for pid, pos in positions.items():
        lot = pos.get('original_lot', 0) or pos.get('lot', 0)
        if lot > 0:
            total += lot
    return round(total, 2)
