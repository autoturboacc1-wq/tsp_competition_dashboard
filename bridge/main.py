import os
import time
import MetaTrader5 as mt5
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
import requests
from collections import Counter
import csv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL", "60")) # Default 60 seconds

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def init_mt5():
    mt5_path = os.getenv("MT5_PATH")
    if mt5_path:
        print(f"Initializing MT5 from: {mt5_path}")
        if not mt5.initialize(path=mt5_path):
            print("initialize() failed, error code =", mt5.last_error())
            return False
    else:
        if not mt5.initialize():
            print("initialize() failed, error code =", mt5.last_error())
            return False
    return True

def send_telegram_message(message):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = {"chat_id": chat_id, "text": message}
    
    try:
        requests.post(url, data=data, timeout=10)
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")

def sync_participant(participant):
    print(f"Syncing participant: {participant['nickname']} ({participant['account_id']})")
    
    # 1. Login to MT5
    try:
        authorized = mt5.login(
            int(participant['account_id']), 
            password=participant['investor_password'], 
            server=participant['server']
        )
    except Exception as e:
        print(f"Login error: {e}")
        return

    if not authorized:
        print(f"Failed to connect to account #{participant['account_id']}, error code: {mt5.last_error()}")
        return

    # 2. Get Account Info
    account_info = mt5.account_info()
    if account_info is None:
        print(f"Failed to get account info, error code: {mt5.last_error()}")
        return

    # 3. Get Trade History (Last 30 days for safety, or all time)
    from_date = datetime(2024, 1, 1, tzinfo=timezone.utc)
    # Add 1 day to current time to avoid timezone mismatches (server time vs local time)
    to_date = datetime.now(timezone.utc) + timedelta(days=1)
    
    print(f"Fetching history from {from_date} to {to_date}...")
    
    # Debug: Check positions (Open trades)
    positions = mt5.positions_get()
    if positions:
        print(f"DEBUG: Found {len(positions)} open positions on account.")
    else:
        print("DEBUG: No open positions found.")

    history_deals = mt5.history_deals_get(from_date, to_date)
    
    if history_deals is None:
        print(f"No history found, error code: {mt5.last_error()}")
    else:
        print(f"Found {len(history_deals)} deals")
        # Process deals and upload to 'trades' table
        # (Implementation detail: Filter for entry/exit and calculate profit)
        
        # Advanced stats calculation
        gross_profit = 0
        gross_loss = 0
        total_holding_time = 0
        holding_counts = 0
        symbols = []
        
        # Initializing missing variables
        total_profit = 0
        wins = 0
        losses = 0
        total_trades = 0
        total_points = 0
        best_trade = -float('inf')
        worst_trade = float('inf')
        
        # Long/Short Stats
        buy_trades = 0
        buy_wins = 0
        sell_trades = 0
        sell_wins = 0
        
        symbol_cache = {}
        
        # For Max DD calculation (Balance based)
        running_balance = 0 # This should ideally start from initial balance, but we can track relative DD
        # Or better: reconstruct balance curve from history if we assume we have full history
        # Since we might not have full history, we can't easily do accurate Max DD without initial balance.
        # However, we can try to use the current balance and work backwards, or just use what we have.
        # Let's use a simplified approach: Max DD of the *profit curve* within the period.
        
        peak_profit = -float('inf')
        current_profit_curve = 0
        max_drawdown_val = 0
        
        # To calculate holding time, we need to match entries and exits.
        # This is complex with just deals. 
        # Simplified approach for holding time: 
        # If we can't easily match, we might skip or use a rough estimate if possible.
        # MT5 deals have 'position_id'. We can group by position_id.
        
        positions = {} # position_id -> {open_time, close_time, ...}
        
        for deal in history_deals:
            # Track symbols
            if deal.symbol:
                symbols.append(deal.symbol)
                
            # Group by position to find holding time and trade details
            pid = deal.position_id
            if pid not in positions:
                positions[pid] = {
                    'open_time': 0, 
                    'close_time': 0, 
                    'profit': 0,
                    'symbol': deal.symbol,
                    'type': 'UNKNOWN',
                    'lot': 0,
                    'open_price': 0,
                    'close_price': 0
                }
            
            if deal.entry == mt5.DEAL_ENTRY_IN:
                positions[pid]['open_time'] = deal.time
                positions[pid]['open_price'] = deal.price
                positions[pid]['lot'] = deal.volume
                # Determine type: 0=Buy, 1=Sell
                positions[pid]['type'] = 'BUY' if deal.type == mt5.ORDER_TYPE_BUY else 'SELL'
                
            elif deal.entry == mt5.DEAL_ENTRY_OUT:
                positions[pid]['close_time'] = deal.time
                positions[pid]['close_price'] = deal.price
                positions[pid]['profit'] += deal.profit
                
                # Stats on closed trades
                total_trades += 1
                total_profit += deal.profit
                
                if deal.profit > 0:
                    wins += 1
                    gross_profit += deal.profit
                elif deal.profit < 0:
                    losses += 1
                    gross_loss += abs(deal.profit)
                
                # Track Best/Worst Trade
                if deal.profit > best_trade:
                    best_trade = deal.profit
                if deal.profit < worst_trade:
                    worst_trade = deal.profit
                
                # Track Long/Short Stats
                if positions[pid]['type'] == 'BUY':
                    buy_trades += 1
                    if deal.profit > 0:
                        buy_wins += 1
                elif positions[pid]['type'] == 'SELL':
                    sell_trades += 1
                    if deal.profit > 0:
                        sell_wins += 1
                
                # Calculate Real Points
                if positions[pid]['open_price'] > 0:
                    sym = deal.symbol
                    if sym:
                        if sym not in symbol_cache:
                            info = mt5.symbol_info(sym)
                            if info is None:
                                # Try to select the symbol in Market Watch if info is missing
                                mt5.symbol_select(sym, True)
                                info = mt5.symbol_info(sym)
                            symbol_cache[sym] = info
                        
                        sym_info = symbol_cache[sym]
                        
                        if sym_info and sym_info.point > 0:
                            if positions[pid]['type'] == 'BUY':
                                p_diff = deal.price - positions[pid]['open_price']
                            else:
                                p_diff = positions[pid]['open_price'] - deal.price
                            
                            total_points += (p_diff / sym_info.point)
                
                # DD Calculation on closed equity/balance curve
                current_profit_curve += deal.profit
                if current_profit_curve > peak_profit:
                    peak_profit = current_profit_curve
                
                dd = peak_profit - current_profit_curve
                if dd > max_drawdown_val:
                    max_drawdown_val = dd

        # Calculate aggregates
        win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
        win_rate_buy = (buy_wins / buy_trades * 100) if buy_trades > 0 else 0
        win_rate_sell = (sell_wins / sell_trades * 100) if sell_trades > 0 else 0
        
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 0)
        
        # Max DD % (Approximate based on Peak Balance)
        # Reconstruct Start Balance (assuming history covers all trades)
        current_balance = account_info.balance
        start_balance = current_balance - total_profit
        peak_balance = start_balance + peak_profit
        
        if peak_balance > 0:
            max_dd_percent = (max_drawdown_val / peak_balance * 100)
        else:
            max_dd_percent = 0

        # Avg Win / Loss
        avg_win = (gross_profit / wins) if wins > 0 else 0
        avg_loss = (gross_loss / losses) if losses > 0 else 0 # Keep positive for display usually, or negative? 
        # Usually Avg Loss is displayed as negative or just the magnitude. Let's keep it as is (positive magnitude if we used abs above? No we used abs for gross_loss).
        # Wait, gross_loss is abs. So avg_loss should be abs.
        avg_loss = -avg_loss # Make it negative to match standard representation if needed, or keep positive. 
        # Let's check UI. "Avg Win $0". Usually implies magnitude.
        # Let's return signed value.
        avg_loss = -(gross_loss / losses) if losses > 0 else 0

        # Holding Time
        total_duration = 0
        duration_count = 0
        
        win_duration = 0
        win_duration_count = 0
        loss_duration = 0
        loss_duration_count = 0
        
        # Consecutive Stats
        # We need to sort positions by close time to calculate consecutive wins/losses accurately
        sorted_positions = sorted(
            [p for p in positions.values() if p['close_time'] > 0],
            key=lambda x: x['close_time']
        )
        
        max_consecutive_wins = 0
        max_consecutive_losses = 0
        current_consecutive_wins = 0
        current_consecutive_losses = 0
        
        for pos in sorted_positions:
            if pos['profit'] > 0:
                current_consecutive_wins += 1
                current_consecutive_losses = 0
                if current_consecutive_wins > max_consecutive_wins:
                    max_consecutive_wins = current_consecutive_wins
            elif pos['profit'] < 0:
                current_consecutive_losses += 1
                current_consecutive_wins = 0
                if current_consecutive_losses > max_consecutive_losses:
                    max_consecutive_losses = current_consecutive_losses
        
        for pid, pos in positions.items():
            if pos['open_time'] > 0 and pos['close_time'] > 0:
                duration = pos['close_time'] - pos['open_time']
                if duration >= 0:
                    total_duration += duration
                    duration_count += 1
                    
                    if pos['profit'] > 0:
                        win_duration += duration
                        win_duration_count += 1
                    elif pos['profit'] < 0:
                        loss_duration += duration
                        loss_duration_count += 1
        
        avg_holding_seconds = (total_duration / duration_count) if duration_count > 0 else 0
        avg_win_holding_seconds = (win_duration / win_duration_count) if win_duration_count > 0 else 0
        avg_loss_holding_seconds = (loss_duration / loss_duration_count) if loss_duration_count > 0 else 0
        
        # Format Holding Time
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
        # Scalping < 30m, Intraday < 24h, Swing > 24h
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
        today = datetime.now().date().isoformat()
        
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
            "max_consecutive_losses": max_consecutive_losses
        }
        
        print(f"Calculated Stats for {participant['nickname']}: WinRate={win_rate:.1f}%, HoldingTime={avg_holding_time_str}, Trades={total_trades}")
        
        # 5. Update Trades History in Supabase
        
        # 5. Update Trades History in Supabase
        trades_data = []
        for pid, pos in positions.items():
            if pos['open_time'] > 0 and pos['close_time'] > 0:
                trades_data.append({
                    "participant_id": participant['id'],
                    "symbol": pos['symbol'],
                    "type": pos['type'],
                    "lot_size": float(pos['lot']),
                    "open_price": float(pos['open_price']),
                    "close_price": float(pos['close_price']),
                    "open_time": datetime.fromtimestamp(pos['open_time'] - 10800, tz=timezone.utc).isoformat(), # Adjust UTC+3 to UTC
                    "close_time": datetime.fromtimestamp(pos['close_time'] - 10800, tz=timezone.utc).isoformat(), # Adjust UTC+3 to UTC
                    "profit": float(pos['profit']),
                    "position_id": pid
                })
        
        if trades_data:
            try:
                # Upsert trades (requires unique constraint on participant_id, position_id)
                data, count = supabase.table('trades').upsert(trades_data, on_conflict='participant_id,position_id').execute()
                print(f"Synced {len(trades_data)} trades for {participant['nickname']}")
            except Exception as e:
                print(f"Error syncing trades: {e}")

        # Upsert to Supabase
        try:
            data, count = supabase.table('daily_stats').upsert(stats_data, on_conflict='participant_id,date').execute()
            print(f"Updated stats for {participant['nickname']}")
        except Exception as e:
            print(f"Error updating stats: {e}")

def sync_participants_from_csv():
    csv_file = 'participants.csv'
    if not os.path.exists(csv_file):
        print(f"Warning: {csv_file} not found. Skipping CSV sync.")
        return

    print(f"Syncing participants from {csv_file} to Supabase...")
    
    try:
        with open(csv_file, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            participants = list(reader)
            
            if not participants:
                print("No participants found in CSV.")
                return

            # Prepare data for upsert
            # We need to handle this carefully. Supabase upsert works best if we have the primary key.
            # But here we might only have account_id as a unique identifier from the user's perspective.
            # We'll query existing participants by account_id to get their IDs if they exist.
            
            for p in participants:
                account_id = p['account_id']
                nickname = p['nickname']
                
                # Check if exists
                res = supabase.table('participants').select("id").eq('account_id', account_id).execute()
                
                data = {
                    "nickname": nickname,
                    "account_id": account_id,
                    "investor_password": p['investor_password'],
                    "server": p['server']
                }
                
                if res.data and len(res.data) > 0:
                    # Update existing (Use the first one found)
                    pid = res.data[0]['id']
                    supabase.table('participants').update(data).eq('id', pid).execute()
                    
                    # If duplicates exist, delete them (Cleanup)
                    if len(res.data) > 1:
                        print(f"Warning: Found duplicate entries for account {account_id}. Cleaning up...")
                        for dup in res.data[1:]:
                            supabase.table('participants').delete().eq('id', dup['id']).execute()
                else:
                    # Insert new
                    supabase.table('participants').insert(data).execute()
                    print(f"Registered new participant: {nickname}")
                    
            print(f"Successfully synced {len(participants)} participants from CSV.")

    except Exception as e:
        print(f"Error syncing participants from CSV: {e}")


def main():
    # 0. Sync Participants from CSV first
    sync_participants_from_csv()

    if not init_mt5():
        return

    print(f"Starting Bridge Service... (Sync Interval: {SYNC_INTERVAL}s)")
    send_telegram_message(f"🚀 Elite Gold Bridge Started!\nSync Interval: {SYNC_INTERVAL}s")

    while True:
        start_time = time.time()
        print(f"\n--- Sync Cycle Start: {datetime.now().strftime('%H:%M:%S')} ---")

        try:
            response = supabase.table('participants').select("*").execute()
            participants = response.data
            
            for p in participants:
                if p.get('account_id') and p.get('investor_password') and p.get('server'):
                    sync_participant(p)
                else:
                    print(f"Skipping {p['nickname']} - Missing credentials")
                    
        except Exception as e:
            error_msg = f"Error in sync cycle: {e}"
            print(error_msg)
            send_telegram_message(f"⚠️ Bridge Error:\n{error_msg}")

        elapsed = time.time() - start_time
        print(f"--- Sync Cycle Complete in {elapsed:.2f}s ---")
        
        print(f"Sleeping for {SYNC_INTERVAL}s...")
        time.sleep(SYNC_INTERVAL)

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
