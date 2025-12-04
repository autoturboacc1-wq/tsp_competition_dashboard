import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

# SQL to alter table
sql = """
ALTER TABLE market_data 
ADD COLUMN IF NOT EXISTS tick_volume bigint,
ADD COLUMN IF NOT EXISTS spread bigint,
ADD COLUMN IF NOT EXISTS real_volume bigint;
"""

# Supabase-py doesn't support direct SQL execution easily without service key or RPC.
# But we can try to use the REST API if we had a function, or just rely on the user to run it.
# Since we are in an agentic flow, I will try to use the `postgres` connection if available, 
# OR just update the mock script to NOT send these columns if they don't exist.
# Updating the mock script is safer and faster for now.

print("Schema update required. Please run the following SQL in Supabase SQL Editor:")
print(sql)
