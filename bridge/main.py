import os
import time
import MetaTrader5 as mt5
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone
import requests

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
    to_date = datetime.now(timezone.utc)
    
    history_deals = mt5.history_deals_get(from_date, to_date)
    
    if history_deals is None:
        print(f"No history found, error code: {mt5.last_error()}")
    else:
        print(f"Found {len(history_deals)} deals")
        # Process deals and upload to 'trades' table
        # (Implementation detail: Filter for entry/exit and calculate profit)
        
        # Simple stats calculation
        total_profit = 0
        wins = 0
        losses = 0
        total_trades = 0
        
        for deal in history_deals:
            if deal.entry == mt5.DEAL_ENTRY_OUT: # Closing deal
                total_trades += 1
                total_profit += deal.profit
                if deal.profit > 0:
                    wins += 1
                elif deal.profit < 0:
                    losses += 1
                    
        win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
        
        # 4. Update Daily Stats in Supabase
        today = datetime.now().date().isoformat()
        
        stats_data = {
            "participant_id": participant['id'],
            "date": today,
            "balance": account_info.balance,
            "equity": account_info.equity,
            "profit": total_profit, # This might need to be cumulative or daily depending on logic
            "points": int(total_profit * 10), # Example scoring logic
            "win_rate": win_rate,
            "total_trades": total_trades,
            # Add other fields...
        }
        
        # Upsert to Supabase
        try:
            data, count = supabase.table('daily_stats').upsert(stats_data, on_conflict='participant_id,date').execute()
            print(f"Updated stats for {participant['nickname']}")
        except Exception as e:
            print(f"Error updating stats: {e}")

def main():
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
