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
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date()
        
        # Get latest snapshot from yesterday
        response = supabase.table('equity_snapshots') \
            .select('equity') \
            .eq('participant_id', participant_id) \
            .gte('timestamp', yesterday.isoformat()) \
            .lt('timestamp', (datetime.now(timezone.utc).date()).isoformat()) \
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
        if pos.get('lot', 0) > 0:
            total += pos['lot']
    return round(total, 2)
