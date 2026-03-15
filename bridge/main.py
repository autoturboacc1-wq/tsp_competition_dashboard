import os
import gc
import time
import MetaTrader5 as mt5
from datetime import datetime, timezone, timedelta
from collections import Counter
import csv
from core import init_mt5, get_supabase_client, load_env, send_telegram_message
from tz_config import THAILAND_TZ
from equity_service import (
    should_record_snapshot,
    record_equity_snapshot,
    calculate_equity_growth,
    calculate_total_lots,
    cleanup_old_snapshots,
    calculate_equity_metrics
)
from smart_alerts import check_alerts
from weekly_report import check_weekly_report
from achievements import check_achievements

# Load environment variables
load_env()

MT5_SERVER_OFFSET_SECONDS = 10800
POSITION_TYPE_BUY = getattr(mt5, 'POSITION_TYPE_BUY', mt5.ORDER_TYPE_BUY)

SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL", "300"))  # Default 5 minutes

# Competition start date (configurable via env, default 2026-01-01 for new season)
HISTORY_START_DATE = os.getenv("HISTORY_START_DATE", "2026-01-01")

# Initialize Supabase client (single instance reused throughout)
supabase = get_supabase_client()

# Global symbol cache - persists across participants and sync cycles
_symbol_cache = {}

def mt5_timestamp_to_iso(timestamp):
    return datetime.fromtimestamp(timestamp - MT5_SERVER_OFFSET_SECONDS, tz=timezone.utc).isoformat()

def sync_open_positions(participant, live_positions):
    synced_at = datetime.now(timezone.utc).isoformat()
    current_position_ids = set()
    positions_data = []

    for position in live_positions or []:
        position_id = int(getattr(position, 'ticket', 0) or 0)
        opened_at = int(getattr(position, 'time', 0) or 0)
        symbol = getattr(position, 'symbol', None)

        if position_id <= 0 or opened_at <= 0 or not symbol:
            continue

        current_position_ids.add(position_id)
        positions_data.append({
            "participant_id": participant['id'],
            "position_id": position_id,
            "symbol": symbol,
            "type": 'BUY' if getattr(position, 'type', None) == POSITION_TYPE_BUY else 'SELL',
            "lot_size": float(getattr(position, 'volume', 0) or 0),
            "open_price": float(getattr(position, 'price_open', 0) or 0),
            "open_time": mt5_timestamp_to_iso(opened_at),
            "sl": float(getattr(position, 'sl', 0) or 0),
            "tp": float(getattr(position, 'tp', 0) or 0),
            "updated_at": synced_at
        })

    try:
        existing_res = supabase.table('open_positions').select('position_id').eq('participant_id', participant['id']).execute()
        existing_ids = {
            int(row['position_id'])
            for row in (existing_res.data or [])
            if row.get('position_id') is not None
        }

        if positions_data:
            supabase.table('open_positions').upsert(positions_data, on_conflict='participant_id,position_id').execute()
            print(f"Synced {len(positions_data)} open positions for {participant['nickname']}")

        stale_ids = existing_ids - current_position_ids
        if not current_position_ids:
            if existing_ids:
                supabase.table('open_positions').delete().eq('participant_id', participant['id']).execute()
                print(f"Cleared {len(existing_ids)} open positions for {participant['nickname']}")
            else:
                print(f"No open positions to sync for {participant['nickname']}")
            return

        for stale_id in stale_ids:
            supabase.table('open_positions').delete().eq('participant_id', participant['id']).eq('position_id', stale_id).execute()

        if stale_ids:
            print(f"Removed {len(stale_ids)} stale open positions for {participant['nickname']}")
    except Exception as e:
        print(f"Error syncing open positions: {e}")

def sync_participant(participant):
    """Sync a single participant's data from MT5 to Supabase."""
    global _symbol_cache

    print(f"Syncing participant: {participant['nickname']} ({participant['account_id']})")

    # 1. Login to MT5
    try:
        authorized = mt5.login(
            int(participant['account_id']),
            password=participant['investor_password'],
            server=participant['server']
        )
    except Exception as e:
        print(f"Login error for {participant['nickname']}: {e}")
        return

    if not authorized:
        print(f"Failed to connect to account #{participant['account_id']}, error code: {mt5.last_error()}")
        return

    # 2. Get Account Info
    account_info = mt5.account_info()
    if account_info is None:
        print(f"Failed to get account info, error code: {mt5.last_error()}")
        return

    # 2.5. Record Equity Snapshot (every 5 minutes)
    if should_record_snapshot(participant['id']):
        record_equity_snapshot(participant['id'], account_info)

    # 3. Get Trade History (from competition start date)
    try:
        from_date = datetime.strptime(HISTORY_START_DATE, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        from_date = datetime(2026, 1, 1, tzinfo=timezone.utc)

    to_date = datetime.now(timezone.utc) + timedelta(days=1)

    # Check positions (Open trades)
    live_positions = mt5.positions_get()
    if live_positions is None:
        print(f"Warning: Failed to fetch open positions, error code: {mt5.last_error()}")
    elif live_positions:
        print(f"Found {len(live_positions)} open positions on account.")
    else:
        print("No open positions found.")

    if live_positions is not None:
        sync_open_positions(participant, live_positions)

    # Build set of currently open position IDs (for partial close detection)
    open_position_ids = set()
    if live_positions:
        for lp in live_positions:
            ticket = int(getattr(lp, 'ticket', 0) or 0)
            if ticket > 0:
                open_position_ids.add(ticket)

    history_deals = mt5.history_deals_get(from_date, to_date)

    if history_deals is None:
        print(f"No history found, error code: {mt5.last_error()}")
    else:
        print(f"Found {len(history_deals)} deals")

        # Pre-fetch all orders in date range to avoid N+1 lookups
        all_orders = mt5.history_orders_get(from_date, to_date)
        order_map = {}
        if all_orders:
            for order in all_orders:
                order_map[order.ticket] = order

        # --- Phase 1: Group all deals by position_id ---
        positions = {}

        for deal in history_deals:
            pid = deal.position_id
            if pid not in positions:
                positions[pid] = {
                    'open_time': 0,
                    'close_time': 0,
                    'total_profit': 0,
                    'symbol': deal.symbol,
                    'type': 'UNKNOWN',
                    'original_lot': 0,
                    'open_price': 0,
                    'close_price': 0,
                    'sl': 0.0,
                    'tp': 0.0,
                    'partials': [],  # list of {lot, close_price, profit, time}
                }

            if deal.entry == mt5.DEAL_ENTRY_IN:
                positions[pid]['open_time'] = deal.time
                positions[pid]['open_price'] = deal.price
                positions[pid]['original_lot'] = deal.volume
                positions[pid]['symbol'] = deal.symbol
                sl = getattr(deal, 'sl', 0.0)
                tp = getattr(deal, 'tp', 0.0)

                if (sl == 0.0 or tp == 0.0) and deal.order > 0:
                    order = order_map.get(deal.order)
                    if order:
                        if sl == 0.0: sl = getattr(order, 'sl', 0.0)
                        if tp == 0.0: tp = getattr(order, 'tp', 0.0)

                positions[pid]['sl'] = sl
                positions[pid]['tp'] = tp
                positions[pid]['type'] = 'BUY' if deal.type == mt5.ORDER_TYPE_BUY else 'SELL'

            elif deal.entry == mt5.DEAL_ENTRY_OUT:
                positions[pid]['close_time'] = deal.time
                positions[pid]['close_price'] = deal.price
                positions[pid]['total_profit'] += deal.profit

                # Track each partial close
                positions[pid]['partials'].append({
                    'lot': deal.volume,
                    'close_price': deal.price,
                    'profit': deal.profit,
                    'time': deal.time,
                })

        # --- Phase 2: Calculate stats from FULLY CLOSED positions only ---
        # A position is fully closed if it has close deals AND is NOT in open_position_ids
        gross_profit = 0
        gross_loss = 0
        total_profit = 0
        wins = 0
        losses = 0
        total_trades = 0
        total_points = 0
        best_trade = -float('inf')
        worst_trade = float('inf')
        buy_trades = 0
        buy_wins = 0
        sell_trades = 0
        sell_wins = 0
        peak_profit = -float('inf')
        current_profit_curve = 0
        max_drawdown_val = 0
        symbols = []

        # Sort closed positions by close_time for accurate DD & consecutive calculation
        closed_positions = []
        for pid, pos in positions.items():
            if pos['close_time'] > 0 and pid not in open_position_ids:
                closed_positions.append((pid, pos))
            if pos['symbol']:
                symbols.append(pos['symbol'])

        closed_positions.sort(key=lambda x: x[1]['close_time'])

        for pid, pos in closed_positions:
            trade_profit = pos['total_profit']
            total_trades += 1
            total_profit += trade_profit

            if trade_profit > 0:
                wins += 1
                gross_profit += trade_profit
            elif trade_profit < 0:
                losses += 1
                gross_loss += abs(trade_profit)

            if trade_profit > best_trade:
                best_trade = trade_profit
            if trade_profit < worst_trade:
                worst_trade = trade_profit

            # Long/Short stats
            if pos['type'] == 'BUY':
                buy_trades += 1
                if trade_profit > 0:
                    buy_wins += 1
            elif pos['type'] == 'SELL':
                sell_trades += 1
                if trade_profit > 0:
                    sell_wins += 1

            # Weighted Points calculation from partials
            if pos['open_price'] > 0 and pos['original_lot'] > 0:
                sym = pos['symbol']
                if sym:
                    if sym not in _symbol_cache:
                        info = mt5.symbol_info(sym)
                        if info is None:
                            mt5.symbol_select(sym, True)
                            info = mt5.symbol_info(sym)
                        _symbol_cache[sym] = info

                    sym_info = _symbol_cache[sym]

                    if sym_info and sym_info.point > 0:
                        for partial in pos['partials']:
                            if pos['type'] == 'BUY':
                                p_diff = partial['close_price'] - pos['open_price']
                            else:
                                p_diff = pos['open_price'] - partial['close_price']

                            raw_points = p_diff / sym_info.point
                            # Weight by partial lot / original lot
                            weighted_points = raw_points * (partial['lot'] / pos['original_lot'])
                            total_points += weighted_points

            # DD Calculation (ordered by close_time)
            current_profit_curve += trade_profit
            if current_profit_curve > peak_profit:
                peak_profit = current_profit_curve

            dd = peak_profit - current_profit_curve
            if dd > max_drawdown_val:
                max_drawdown_val = dd

        still_open = sum(1 for pid in positions if pid in open_position_ids and positions[pid]['close_time'] > 0)
        if still_open > 0:
            print(f"  Skipped {still_open} partially-closed positions (still open)")

        # Calculate aggregates
        win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
        win_rate_buy = (buy_wins / buy_trades * 100) if buy_trades > 0 else 0
        win_rate_sell = (sell_wins / sell_trades * 100) if sell_trades > 0 else 0

        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 0)

        # Max DD %
        current_balance = account_info.balance
        start_balance = current_balance - total_profit
        peak_balance = start_balance + peak_profit

        if peak_balance > 0:
            closed_trade_dd = (max_drawdown_val / peak_balance * 100)
        else:
            closed_trade_dd = 0

        equity_metrics = calculate_equity_metrics(participant['id'], fallback_dd=closed_trade_dd)
        max_dd_percent = equity_metrics['max_drawdown']
        peak_equity = equity_metrics['peak_equity']

        # Avg Win / Loss
        avg_win = (gross_profit / wins) if wins > 0 else 0
        avg_loss = -(gross_loss / losses) if losses > 0 else 0

        # RR Ratio
        rr_ratio = abs(avg_win / avg_loss) if avg_loss != 0 else 0

        # Holding Time, Consecutive Stats, Session Stats - all from closed_positions
        total_duration = 0
        duration_count = 0
        win_duration = 0
        win_duration_count = 0
        loss_duration = 0
        loss_duration_count = 0

        max_consecutive_wins = 0
        max_consecutive_losses = 0
        current_consecutive_wins = 0
        current_consecutive_losses = 0

        session_stats = {
            'asian': {'profit': 0, 'wins': 0, 'total': 0},
            'london': {'profit': 0, 'wins': 0, 'total': 0},
            'newyork': {'profit': 0, 'wins': 0, 'total': 0}
        }

        for pid, pos in closed_positions:
            trade_profit = pos['total_profit']

            # Consecutive wins/losses (already sorted by close_time)
            if trade_profit > 0:
                current_consecutive_wins += 1
                current_consecutive_losses = 0
                if current_consecutive_wins > max_consecutive_wins:
                    max_consecutive_wins = current_consecutive_wins
            elif trade_profit < 0:
                current_consecutive_losses += 1
                current_consecutive_wins = 0
                if current_consecutive_losses > max_consecutive_losses:
                    max_consecutive_losses = current_consecutive_losses

            # Session stats
            if pos['open_time'] > 0:
                open_hour = datetime.utcfromtimestamp(pos['open_time'] - 10800).hour
                is_win = trade_profit > 0

                if 0 <= open_hour < 8:
                    session_stats['asian']['profit'] += trade_profit
                    session_stats['asian']['total'] += 1
                    if is_win: session_stats['asian']['wins'] += 1

                if 7 <= open_hour < 16:
                    session_stats['london']['profit'] += trade_profit
                    session_stats['london']['total'] += 1
                    if is_win: session_stats['london']['wins'] += 1

                if 12 <= open_hour < 21:
                    session_stats['newyork']['profit'] += trade_profit
                    session_stats['newyork']['total'] += 1
                    if is_win: session_stats['newyork']['wins'] += 1

            # Holding time
            if pos['open_time'] > 0 and pos['close_time'] > 0:
                duration = pos['close_time'] - pos['open_time']
                if duration >= 0:
                    total_duration += duration
                    duration_count += 1

                    if trade_profit > 0:
                        win_duration += duration
                        win_duration_count += 1
                    elif trade_profit < 0:
                        loss_duration += duration
                        loss_duration_count += 1

        avg_holding_seconds = (total_duration / duration_count) if duration_count > 0 else 0
        avg_win_holding_seconds = (win_duration / win_duration_count) if win_duration_count > 0 else 0
        avg_loss_holding_seconds = (loss_duration / loss_duration_count) if loss_duration_count > 0 else 0

        def format_duration(seconds):
            m, s = divmod(seconds, 60)
            h, m = divmod(m, 60)
            d, h = divmod(h, 24)
            if d > 0: return f"{int(d)}d {int(h)}h"
            if h > 0: return f"{int(h)}h {int(m)}m"
            return f"{int(m)}m {int(s)}s"

        avg_holding_time_str = format_duration(avg_holding_seconds)
        avg_holding_time_win_str = format_duration(avg_win_holding_seconds)
        avg_holding_time_loss_str = format_duration(avg_loss_holding_seconds)

        # Trading Style
        avg_holding_minutes = avg_holding_seconds / 60
        if avg_holding_minutes < 30:
            trading_style = "Scalping"
        elif avg_holding_minutes < 1440:
            trading_style = "Intraday"
        else:
            trading_style = "Swing"

        if duration_count == 0:
            trading_style = "Unknown"

        # Favorite Pair
        favorite_pair = "-"
        if symbols:
            c = Counter(symbols)
            favorite_pair = c.most_common(1)[0][0]

        # 4. Update Daily Stats in Supabase
        today = datetime.now(THAILAND_TZ).date().isoformat()

        stats_data = {
            "participant_id": participant['id'],
            "date": today,
            "balance": account_info.balance,
            "equity": account_info.equity,
            "profit": total_profit,
            "points": int(total_points),
            "win_rate": win_rate,
            "total_trades": total_trades,
            "profit_factor": round(profit_factor, 2),
            "rr_ratio": round(rr_ratio, 2),
            "max_drawdown": round(max_dd_percent, 2),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "trading_style": trading_style,
            "favorite_pair": favorite_pair,
            "avg_holding_time": avg_holding_time_str,
            "best_trade": float(best_trade) if best_trade != -float('inf') else 0,
            "worst_trade": float(worst_trade) if worst_trade != float('inf') else 0,
            "win_rate_buy": round(win_rate_buy, 2),
            "win_rate_sell": round(win_rate_sell, 2),
            "avg_holding_time_win": avg_holding_time_win_str,
            "avg_holding_time_loss": avg_holding_time_loss_str,
            "max_consecutive_wins": max_consecutive_wins,
            "max_consecutive_losses": max_consecutive_losses,
            "session_asian_profit": round(session_stats['asian']['profit'], 2),
            "session_london_profit": round(session_stats['london']['profit'], 2),
            "session_newyork_profit": round(session_stats['newyork']['profit'], 2),
            "session_asian_win_rate": round((session_stats['asian']['wins'] / session_stats['asian']['total'] * 100), 2) if session_stats['asian']['total'] > 0 else 0,
            "session_london_win_rate": round((session_stats['london']['wins'] / session_stats['london']['total'] * 100), 2) if session_stats['london']['total'] > 0 else 0,
            "session_newyork_win_rate": round((session_stats['newyork']['wins'] / session_stats['newyork']['total'] * 100), 2) if session_stats['newyork']['total'] > 0 else 0,
            "floating_pl": round(account_info.equity - account_info.balance, 2),
            "total_lots": calculate_total_lots(positions),
            "equity_growth_percent": calculate_equity_growth(participant['id'], account_info.equity),
            "peak_equity": peak_equity
        }

        print(f"Stats for {participant['nickname']}: WinRate={win_rate:.1f}%, Trades={total_trades}")

        # 5. Update Trades History in Supabase (fully closed positions only)
        trades_data = []
        for pid, pos in closed_positions:
            if pos['open_time'] > 0:
                trades_data.append({
                    "participant_id": participant['id'],
                    "symbol": pos['symbol'],
                    "type": pos['type'],
                    "lot_size": float(pos['original_lot']),
                    "open_price": float(pos['open_price']),
                    "close_price": float(pos['close_price']),
                    "sl": float(pos.get('sl', 0)),
                    "tp": float(pos.get('tp', 0)),
                    "open_time": mt5_timestamp_to_iso(pos['open_time']),
                    "close_time": mt5_timestamp_to_iso(pos['close_time']),
                    "profit": float(pos['total_profit']),
                    "position_id": pid
                })

        if trades_data:
            try:
                supabase.table('trades').upsert(trades_data, on_conflict='participant_id,position_id').execute()
                print(f"Synced {len(trades_data)} trades for {participant['nickname']}")
            except Exception as e:
                print(f"Error syncing trades: {e}")

        # Upsert daily stats
        try:
            supabase.table('daily_stats').upsert(stats_data, on_conflict='participant_id,date').execute()
            print(f"Updated stats for {participant['nickname']}")

            try:
                check_achievements(participant['id'], stats_data)
            except Exception as e:
                print(f"[Achievements] Error for {participant['nickname']}: {e}")
        except Exception as e:
            print(f"Error updating stats: {e}")

        # Free large data structures
        del positions, order_map, trades_data, history_deals, closed_positions
        if all_orders:
            del all_orders

_csv_last_mtime = 0

def sync_participants_from_csv(force=False):
    global _csv_last_mtime
    csv_file = 'participants.csv'
    if not os.path.exists(csv_file):
        print(f"Warning: {csv_file} not found. Skipping CSV sync.")
        return

    # Only sync if file was modified since last check
    current_mtime = os.path.getmtime(csv_file)
    if not force and current_mtime == _csv_last_mtime:
        return
    _csv_last_mtime = current_mtime

    print(f"Syncing participants from {csv_file} to Supabase...")

    try:
        with open(csv_file, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            participants = list(reader)

            if not participants:
                print("No participants found in CSV.")
                return

            for p in participants:
                account_id = p['account_id']
                nickname = p['nickname']

                res = supabase.table('participants').select("id").eq('account_id', account_id).execute()

                data = {
                    "nickname": nickname,
                    "account_id": account_id,
                    "investor_password": p['investor_password'],
                    "server": p['server']
                }

                if res.data and len(res.data) > 0:
                    pid = res.data[0]['id']
                    supabase.table('participants').update(data).eq('id', pid).execute()

                    if len(res.data) > 1:
                        print(f"Warning: Found duplicate entries for account {account_id}. Cleaning up...")
                        for dup in res.data[1:]:
                            supabase.table('participants').delete().eq('id', dup['id']).execute()
                else:
                    supabase.table('participants').insert(data).execute()
                    print(f"Registered new participant: {nickname}")

            print(f"Successfully synced {len(participants)} participants from CSV.")

    except Exception as e:
        print(f"Error syncing participants from CSV: {e}")


def main():
    # 0. Sync Participants from CSV first (force on startup)
    sync_participants_from_csv(force=True)

    if not init_mt5():
        return

    print(f"Starting Bridge Service... (Sync Interval: {SYNC_INTERVAL}s)")
    send_telegram_message(f"🚀 Elite Gold Bridge Started!\nSync Interval: {SYNC_INTERVAL}s\nHistory from: {HISTORY_START_DATE}")

    while True:
        start_time = time.time()
        print(f"\n--- Sync Cycle Start: {datetime.now(THAILAND_TZ).strftime('%H:%M:%S')} ---")

        try:
            response = supabase.table('participants').select("*").execute()
            participants = response.data

            for p in participants:
                if p.get('account_id') and p.get('investor_password') and p.get('server'):
                    try:
                        sync_participant(p)
                    except Exception as e:
                        print(f"[ERROR] Failed to sync {p['nickname']}: {e}")
                else:
                    print(f"Skipping {p['nickname']} - Missing credentials")

        except Exception as e:
            error_msg = f"Error in sync cycle: {e}"
            print(error_msg)
            send_telegram_message(f"⚠️ Bridge Error:\n{error_msg}")

        elapsed = time.time() - start_time
        print(f"--- Sync Cycle Complete in {elapsed:.2f}s ---")

        # Post-sync tasks
        try:
            check_alerts()
        except Exception as e:
            print(f"[Smart Alerts] Error: {e}")

        try:
            check_weekly_report()
        except Exception as e:
            print(f"[Weekly Report] Error: {e}")

        cleanup_old_snapshots()
        sync_participants_from_csv()

        # Force garbage collection after each cycle
        gc.collect()

        # Sleep for remaining time (prevent overlapping if sync took long)
        sleep_time = max(10, SYNC_INTERVAL - (time.time() - start_time))
        print(f"Next sync in {sleep_time:.0f}s...")
        time.sleep(sleep_time)

    mt5.shutdown()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopping Bridge Service...")
        send_telegram_message("🛑 Elite Gold Bridge Stopped (Manual)")
        mt5.shutdown()
    except Exception as e:
        print(f"\nCritical Error: {e}")
        send_telegram_message(f"💀 Bridge Crashed:\n{e}")
        mt5.shutdown()
