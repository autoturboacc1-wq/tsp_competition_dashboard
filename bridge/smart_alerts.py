"""
Smart Alerts Engine for TSP Competition
Detects notable events and sends Telegram notifications
"""
import os
from datetime import datetime, timezone
from core import get_supabase_client, send_telegram_message
from tz_config import THAILAND_TZ

# In-memory state to track changes between sync cycles
_previous_state = {
    'rankings': {},        # participant_id -> rank
    'trade_counts': {},    # participant_id -> total_trades
    'streaks': {},         # participant_id -> current_consecutive_wins
    'drawdown_alerted': {},# participant_id -> True (to avoid spamming)
    'initialized': False
}

# Configurable thresholds
STREAK_THRESHOLD = int(os.getenv("ALERT_STREAK_THRESHOLD", "3"))         # Alert on X consecutive wins
BIG_TRADE_PROFIT = float(os.getenv("ALERT_BIG_TRADE_PROFIT", "50"))      # $ profit threshold
BIG_TRADE_LOSS = float(os.getenv("ALERT_BIG_TRADE_LOSS", "-50"))         # $ loss threshold
DRAWDOWN_WARNING = float(os.getenv("ALERT_DRAWDOWN_PERCENT", "10"))      # % drawdown warning
MILESTONE_INTERVAL = int(os.getenv("ALERT_MILESTONE_INTERVAL", "50"))    # Every N trades


def check_alerts():
    """Main alert check - call this after each sync cycle"""
    supabase = get_supabase_client()
    alerts = []

    try:
        # Fetch current leaderboard (latest daily_stats per participant)
        stats_res = supabase.table('daily_stats') \
            .select("participant_id, points, profit, total_trades, max_drawdown, max_consecutive_wins, win_rate, date") \
            .order('date', desc=True) \
            .execute()

        # Fetch participant names
        participants_res = supabase.table('participants').select("id, nickname").execute()
        names = {p['id']: p['nickname'] for p in participants_res.data}

        # Get latest stats per participant (first occurrence since sorted desc by date)
        latest_stats = {}
        for row in stats_res.data:
            pid = row['participant_id']
            if pid not in latest_stats:
                latest_stats[pid] = row

        # Build current rankings by points (desc)
        ranked = sorted(latest_stats.items(), key=lambda x: x[1].get('points', 0), reverse=True)
        current_rankings = {pid: rank + 1 for rank, (pid, _) in enumerate(ranked)}

        # --- DETECT EVENTS ---

        if not _previous_state['initialized']:
            # First run - just save state, don't alert
            _save_state(current_rankings, latest_stats)
            print("[Smart Alerts] Initialized - tracking state from next cycle")
            return

        # 1. Rank Changes
        alerts.extend(_check_rank_changes(current_rankings, names))

        # 2. Win Streaks
        alerts.extend(_check_win_streaks(latest_stats, names))

        # 3. New Big Trades
        alerts.extend(_check_new_trades(supabase, latest_stats, names))

        # 4. Drawdown Warnings
        alerts.extend(_check_drawdown(latest_stats, names))

        # 5. Trade Milestones
        alerts.extend(_check_milestones(latest_stats, names))

        # Save current state for next cycle
        _save_state(current_rankings, latest_stats)

        # Send alerts
        if alerts:
            _send_alerts(alerts)

    except Exception as e:
        print(f"[Smart Alerts] Error: {e}")


def _check_rank_changes(current_rankings, names):
    """Detect when a trader overtakes another in rankings"""
    alerts = []
    prev = _previous_state['rankings']

    for pid, new_rank in current_rankings.items():
        old_rank = prev.get(pid)
        if old_rank is None:
            continue

        name = names.get(pid, 'Unknown')

        # Moved up (smaller rank = better)
        if new_rank < old_rank:
            # Find who they overtook
            overtaken = []
            for other_pid, other_new_rank in current_rankings.items():
                other_old_rank = prev.get(other_pid)
                if other_pid != pid and other_old_rank is not None:
                    if other_old_rank < old_rank and other_new_rank > new_rank:
                        overtaken.append(names.get(other_pid, 'Unknown'))

            if overtaken:
                alerts.append({
                    'type': 'rank_up',
                    'icon': '🔥',
                    'message': f"<b>{name}</b> ขึ้นมาอันดับ {new_rank}! แซง {', '.join(overtaken)} แล้ว"
                })
            else:
                alerts.append({
                    'type': 'rank_up',
                    'icon': '📈',
                    'message': f"<b>{name}</b> ขยับขึ้นมาอันดับ {new_rank} (จากอันดับ {old_rank})"
                })

    return alerts


def _check_win_streaks(latest_stats, names):
    """Detect notable win streaks"""
    alerts = []
    prev_streaks = _previous_state['streaks']

    for pid, stats in latest_stats.items():
        current_streak = stats.get('max_consecutive_wins', 0)
        prev_streak = prev_streaks.get(pid, 0)
        name = names.get(pid, 'Unknown')

        if current_streak >= STREAK_THRESHOLD and current_streak > prev_streak:
            alerts.append({
                'type': 'streak',
                'icon': '🎯',
                'message': f"<b>{name}</b> ชนะรวด {current_streak} ไม้ติดต่อกัน!"
            })

    return alerts


def _check_new_trades(supabase, latest_stats, names):
    """Detect big profit/loss trades closed since last check"""
    alerts = []
    prev_counts = _previous_state['trade_counts']

    for pid, stats in latest_stats.items():
        current_count = stats.get('total_trades', 0)
        prev_count = prev_counts.get(pid, 0)
        name = names.get(pid, 'Unknown')

        if current_count > prev_count:
            # New trades closed - fetch the latest ones
            try:
                new_trades_res = supabase.table('trades') \
                    .select("symbol, type, lot_size, profit, open_time, close_time") \
                    .eq('participant_id', pid) \
                    .order('close_time', desc=True) \
                    .limit(current_count - prev_count) \
                    .execute()

                for trade in new_trades_res.data:
                    profit = trade['profit']
                    symbol = trade['symbol']
                    lot = trade['lot_size']
                    trade_type = trade['type']

                    if profit >= BIG_TRADE_PROFIT:
                        alerts.append({
                            'type': 'big_win',
                            'icon': '💰',
                            'message': f"<b>{name}</b> ปิด {trade_type} {symbol} ({lot} lot) กำไร <b>+${profit:.2f}</b>"
                        })
                    elif profit <= BIG_TRADE_LOSS:
                        alerts.append({
                            'type': 'big_loss',
                            'icon': '📉',
                            'message': f"<b>{name}</b> ปิด {trade_type} {symbol} ({lot} lot) ขาดทุน <b>${profit:.2f}</b>"
                        })

            except Exception as e:
                print(f"[Smart Alerts] Error fetching trades for {name}: {e}")

    return alerts


def _check_drawdown(latest_stats, names):
    """Alert when drawdown exceeds threshold"""
    alerts = []
    prev_alerted = _previous_state['drawdown_alerted']

    for pid, stats in latest_stats.items():
        dd = stats.get('max_drawdown', 0)
        name = names.get(pid, 'Unknown')

        if dd >= DRAWDOWN_WARNING and not prev_alerted.get(pid, False):
            alerts.append({
                'type': 'drawdown',
                'icon': '⚠️',
                'message': f"<b>{name}</b> มี Max Drawdown ถึง {dd:.1f}% แล้ว!"
            })
            _previous_state['drawdown_alerted'][pid] = True

        elif dd < DRAWDOWN_WARNING * 0.8:
            # Reset alert when DD recovers below 80% of threshold
            _previous_state['drawdown_alerted'][pid] = False

    return alerts


def _check_milestones(latest_stats, names):
    """Detect trade count milestones"""
    alerts = []
    prev_counts = _previous_state['trade_counts']

    for pid, stats in latest_stats.items():
        current = stats.get('total_trades', 0)
        prev = prev_counts.get(pid, 0)
        name = names.get(pid, 'Unknown')

        if current == 0:
            continue

        # Check if crossed a milestone boundary
        current_milestone = (current // MILESTONE_INTERVAL) * MILESTONE_INTERVAL
        prev_milestone = (prev // MILESTONE_INTERVAL) * MILESTONE_INTERVAL

        if current_milestone > prev_milestone and current_milestone > 0:
            win_rate = stats.get('win_rate', 0)
            alerts.append({
                'type': 'milestone',
                'icon': '🏆',
                'message': f"<b>{name}</b> ครบ {current_milestone} เทรดแล้ว! (Win Rate: {win_rate:.1f}%)"
            })

    return alerts


def _save_state(current_rankings, latest_stats):
    """Save current state for comparison in next cycle"""
    _previous_state['rankings'] = current_rankings.copy()
    _previous_state['trade_counts'] = {
        pid: stats.get('total_trades', 0)
        for pid, stats in latest_stats.items()
    }
    _previous_state['streaks'] = {
        pid: stats.get('max_consecutive_wins', 0)
        for pid, stats in latest_stats.items()
    }
    _previous_state['initialized'] = True


def _send_alerts(alerts):
    """Bundle and send alerts via Telegram"""
    # Group alerts into a single message (max 4096 chars for Telegram)
    header = "🔔 <b>Smart Alert</b>\n"
    separator = "─" * 20

    lines = [header]
    for alert in alerts:
        lines.append(f"{alert['icon']} {alert['message']}")

    lines.append(f"\n{separator}")
    lines.append(f"⏰ {datetime.now(THAILAND_TZ).strftime('%H:%M ICT')}")

    message = "\n".join(lines)

    # Telegram message limit is 4096 chars
    if len(message) > 4000:
        # Split into chunks
        chunks = [alerts[i:i+5] for i in range(0, len(alerts), 5)]
        for chunk in chunks:
            chunk_lines = [header]
            for alert in chunk:
                chunk_lines.append(f"{alert['icon']} {alert['message']}")
            send_telegram_message("\n".join(chunk_lines), parse_mode="HTML")
    else:
        send_telegram_message(message, parse_mode="HTML")

    print(f"[Smart Alerts] Sent {len(alerts)} alert(s)")
