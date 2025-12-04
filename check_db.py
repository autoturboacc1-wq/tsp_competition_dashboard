import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("bridge/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    response = supabase.table('daily_stats').select('participant_id, avg_holding_time, participants(nickname)').execute()
    for row in response.data:
        nickname = row['participants']['nickname'] if row['participants'] else 'Unknown'
        print(f"User: {nickname}, Holding Time: {row.get('avg_holding_time')}")
except Exception as e:
    print(f"Error: {e}")
