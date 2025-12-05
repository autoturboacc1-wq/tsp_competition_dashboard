import os
import MetaTrader5 as mt5
from supabase import create_client, Client
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

def load_env():
    """Ensure env vars are loaded (idempotent)"""
    load_dotenv()

def get_supabase_client() -> Client:
    """Initialize and return Supabase client"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
        exit(1)
        
    return create_client(url, key)

def init_mt5() -> bool:
    """Initialize MetaTrader 5 connection"""
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
            
    print(f"MT5 Initialized: {mt5.terminal_info()}")
    return True

def send_telegram_message(message: str):
    """Send a message to the configured Telegram chat"""
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
