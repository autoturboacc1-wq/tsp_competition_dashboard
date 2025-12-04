import os
import csv
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CSV_FILE = 'participants.csv'

def import_participants():
    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} not found. Please create it from participants.csv.example")
        return

    print(f"Reading {CSV_FILE}...")
    
    participants_to_insert = []
    
    try:
        with open(CSV_FILE, mode='r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Basic validation
                if not row['nickname'] or not row['account_id']:
                    print(f"Skipping invalid row: {row}")
                    continue
                
                participants_to_insert.append({
                    "nickname": row['nickname'].strip(),
                    "account_id": row['account_id'].strip(),
                    "investor_password": row['investor_password'].strip(),
                    "server": row['server'].strip()
                })
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    if not participants_to_insert:
        print("No valid participants found to import.")
        return

    print(f"Found {len(participants_to_insert)} participants. Importing to Supabase...")

    try:
        # Using upsert to update existing records based on account_id (unique constraint)
        data, count = supabase.table('participants').upsert(
            participants_to_insert, 
            on_conflict='account_id'
        ).execute()
        
        print("Import successful!")
        # print(data)
    except Exception as e:
        print(f"Error importing to Supabase: {e}")

if __name__ == "__main__":
    import_participants()
