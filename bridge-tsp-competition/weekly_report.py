"""
Weekly Report Generator for TSP Competition
Generates AI-powered weekly summary and sends via Telegram
"""
import os
from datetime import datetime, timezone, timedelta
from core import get_supabase_client, send_telegram_message
from tz_config import THAILAND_TZ

# Run weekly report on Sunday at 20:00 ICT
REPORT_DAY = int(os.getenv("WEEKLY_REPORT_DAY", "6"))  # 0=Mon, 6=Sun
REPORT_HOUR = int(os.getenv("WEEKLY_REPORT_HOUR", "20"))

_last_report_week = None


def should_send_weekly_report() -> bool:
    """Check if it's time to send the weekly report"""
    global _last_report_week
    now = datetime.now(THAILAND_TZ)

    if now.weekday() != REPORT_DAY:
        return False
    if now.hour != REPORT_HOUR:
        return False

    # Prevent duplicate sends in the same week
    year_week = now.isocalendar()[:2]
    if _last_report_week == year_week:
        return False

    return True


def generate_and_send_weekly_report():
    """Generate weekly competition report and send via Telegram"""
    global _last_report_week
    now = datetime.now(THAILAND_TZ)

    supabase = get_supabase_client()

    try:
        week_start = (now - timedelta(days=7)).date().isoformat()
        week_end = now.date().isoformat()

        # Get current standings (latest stats per participant)
        stats_res = supabase.table('daily_stats') \
            .select("participant_id, points, profit, total_trades, win_rate, max_drawdown, trading_style, date") \
            .order('date', desc=True) \
            .execute()

        # Get participant names
        participants_res = supabase.table('participants').select("id, nickname").execute()
        names = {p['id']: p['nickname'] for p in participants_res.data}

        # Latest stats per participant
        latest = {}
        for row in stats_res.data:
            pid = row['participant_id']
            if pid not in latest:
                latest[pid] = row

        # Get stats from a week ago for comparison
        week_ago_stats = {}
        for row in stats_res.data:
            pid = row['participant_id']
            if row['date'] <= week_start and pid not in week_ago_stats:
                week_ago_stats[pid] = row

        # Build rankings
        ranked = sorted(latest.items(), key=lambda x: x[1].get('points', 0), reverse=True)

        # Get recent trades for "trade of the week"
        trades_res = supabase.table('trades') \
            .select("participant_id, symbol, type, profit, lot_size, close_time") \
            .gte('close_time', week_start) \
            .order('profit', desc=True) \
            .limit(100) \
            .execute()

        best_trade = None
        worst_trade = None
        total_weekly_trades = len(trades_res.data) if trades_res.data else 0

        if trades_res.data:
            best_trade = trades_res.data[0]
            worst_trade = min(trades_res.data, key=lambda t: t['profit'])

        # Build report
        lines = []
        lines.append("<b>📊 Weekly Competition Report</b>")
        lines.append(f"📅 {week_start} - {week_end}")
        lines.append("")

        # Current Standings
        lines.append("<b>🏆 Current Standings</b>")
        medals = ['🥇', '🥈', '🥉']
        for i, (pid, stats) in enumerate(ranked[:10]):
            name = names.get(pid, 'Unknown')
            points = stats.get('points', 0)
            profit = stats.get('profit', 0)
            medal = medals[i] if i < 3 else f" {i+1}."

            # Calculate weekly change
            old = week_ago_stats.get(pid, {})
            old_points = old.get('points', 0)
            point_diff = points - old_points
            diff_str = f" (+{point_diff})" if point_diff > 0 else f" ({point_diff})" if point_diff < 0 else ""

            lines.append(f"{medal} <b>{name}</b> - {points} pts{diff_str} | ${profit:.2f}")

        lines.append("")

        # Top Movers
        movers = []
        for pid, stats in latest.items():
            old = week_ago_stats.get(pid, {})
            old_points = old.get('points', 0)
            diff = stats.get('points', 0) - old_points
            movers.append((pid, diff))

        movers.sort(key=lambda x: x[1], reverse=True)

        if movers and movers[0][1] > 0:
            lines.append("<b>🚀 Top Mover of the Week</b>")
            top_pid, top_diff = movers[0]
            lines.append(f"  {names.get(top_pid, 'Unknown')} (+{top_diff} points)")
            lines.append("")

        # Trade of the Week
        if best_trade:
            lines.append("<b>💰 Best Trade of the Week</b>")
            bt_name = names.get(best_trade['participant_id'], 'Unknown')
            lines.append(f"  {bt_name}: {best_trade['type']} {best_trade['symbol']} +${best_trade['profit']:.2f}")

        if worst_trade and worst_trade['profit'] < 0:
            lines.append(f"\n<b>📉 Biggest Loss</b>")
            wt_name = names.get(worst_trade['participant_id'], 'Unknown')
            lines.append(f"  {wt_name}: {worst_trade['type']} {worst_trade['symbol']} ${worst_trade['profit']:.2f}")

        lines.append("")

        # Weekly Stats Summary
        lines.append(f"<b>📈 Weekly Summary</b>")
        lines.append(f"  Total Trades: {total_weekly_trades}")
        lines.append(f"  Active Traders: {len(latest)}")

        # Average win rate
        win_rates = [s.get('win_rate', 0) for s in latest.values() if s.get('win_rate', 0) > 0]
        if win_rates:
            avg_wr = sum(win_rates) / len(win_rates)
            lines.append(f"  Avg Win Rate: {avg_wr:.1f}%")

        lines.append("")
        lines.append("─" * 20)
        lines.append("🤖 <i>Auto-generated by TSP Competition AI</i>")

        message = "\n".join(lines)
        send_telegram_message(message, parse_mode="HTML")

        _last_report_week = now.isocalendar()[:2]
        print(f"[Weekly Report] Sent successfully for week {week_start} to {week_end}")

    except Exception as e:
        print(f"[Weekly Report] Error: {e}")
        send_telegram_message(f"⚠️ Weekly Report Error:\n{e}")


def check_weekly_report():
    """Call this from main loop - only generates report at scheduled time"""
    if should_send_weekly_report():
        generate_and_send_weekly_report()
