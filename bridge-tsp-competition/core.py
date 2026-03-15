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

_supabase_client = None

def get_supabase_client() -> Client:
    """Return singleton Supabase client (reused across all modules)"""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
        exit(1)

    _supabase_client = create_client(url, key)
    return _supabase_client

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

def send_telegram_message(message: str, parse_mode: str = None, chat_id: str = None):
    """Send a message to a Telegram chat. Uses TELEGRAM_CHAT_ID if chat_id not specified."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    target = chat_id or os.getenv("TELEGRAM_CHAT_ID")

    if not token or not target:
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = {"chat_id": target, "text": message}
    if parse_mode:
        data["parse_mode"] = parse_mode

    try:
        requests.post(url, data=data, timeout=10)
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")


def send_telegram_to_participant(participant_id: str, message: str, parse_mode: str = "HTML"):
    """Send a personal Telegram message to a participant if they have linked their account"""
    supabase = get_supabase_client()
    try:
        res = supabase.table('participants').select('telegram_chat_id').eq('id', participant_id).single().execute()
        chat_id = res.data.get('telegram_chat_id') if res.data else None
        if chat_id:
            send_telegram_message(message, parse_mode=parse_mode, chat_id=chat_id)
    except Exception as e:
        print(f"Failed to send personal Telegram to {participant_id}: {e}")
