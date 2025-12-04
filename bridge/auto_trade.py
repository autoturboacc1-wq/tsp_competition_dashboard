import MetaTrader5 as mt5
import csv
import time
import random
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
CSV_FILE = 'participants.csv'
SYMBOL = "XAUUSD"  # Pair to trade
VOLUME = 0.01
TP_SL_POINTS = 500  # 500 points = 50 pips (for XAUUSD 1.00 movement is 100 points usually, depends on digits)
CHECK_INTERVAL = 10 # Seconds between cycles

def init_mt5():
    mt5_path = os.getenv("MT5_PATH_AUTOTRADE")
    if mt5_path:
        print(f"Initializing MT5 (AutoTrade) from: {mt5_path}")
        if not mt5.initialize(path=mt5_path):
            print("initialize() failed, error code =", mt5.last_error())
            return False
    else:
        if not mt5.initialize():
            print("initialize() failed, error code =", mt5.last_error())
            return False
    return True

def get_participants():
    participants = []
    if not os.path.exists(CSV_FILE):
        print(f"{CSV_FILE} not found!")
        return []
    
    with open(CSV_FILE, mode='r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row['account_id']:
                participants.append(row)
    return participants

def open_random_trade(symbol, volume, points):
    # Check symbol (Try variants if not found)
    symbol_variants = [symbol, symbol + "m", symbol + "c", "GOLD", "GOLDm"]
    found_symbol = None
    
    for s in symbol_variants:
        info = mt5.symbol_info(s)
        if info is not None:
            found_symbol = s
            break
            
    if found_symbol is None:
        print(f"{symbol} (and variants) not found")
        return False
        
    symbol = found_symbol # Use the found symbol name
    symbol_info = mt5.symbol_info(symbol) # Refresh info for the correct symbol

    if not symbol_info.visible:
        if not mt5.symbol_select(symbol, True):
            print(f"symbol_select({symbol}) failed")
            return False

    # Random Direction
    action_type = random.choice([mt5.ORDER_TYPE_BUY, mt5.ORDER_TYPE_SELL])
    
    price = 0.0
    sl = 0.0
    tp = 0.0
    point = symbol_info.point

    if action_type == mt5.ORDER_TYPE_BUY:
        price = mt5.symbol_info_tick(symbol).ask
        sl = price - points * point
        tp = price + points * point
        type_str = "BUY"
    else:
        price = mt5.symbol_info_tick(symbol).bid
        sl = price + points * point
        tp = price - points * point
        type_str = "SELL"

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": action_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 123456,
        "comment": "AutoTrade Script",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    # Send order
    result = mt5.order_send(request)
    
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"Failed to {type_str}: {result.comment}")
        return False
    
    print(f"Opened {type_str} {symbol} @ {price} (SL: {sl}, TP: {tp})")
    return True

def process_account(p):
    try:
        account_id = int(p['account_id'])
        password = p['investor_password']
        server = p['server']
        
        # Login
        if not mt5.login(account_id, password=password, server=server):
            print(f"Login failed for {p['nickname']} (#{account_id})")
            return

        # Check positions
        positions = mt5.positions_get()
        
        if positions is None:
            print(f"Error getting positions for {p['nickname']}")
            return

        if len(positions) == 0:
            print(f"[{p['nickname']}] No positions. Opening new trade...")
            open_random_trade(SYMBOL, VOLUME, TP_SL_POINTS)
        else:
            print(f"[{p['nickname']}] Has {len(positions)} position(s). Skipping.")

    except Exception as e:
        print(f"Error processing {p['nickname']}: {e}")

def main():
    if not init_mt5():
        return

    print("--- Auto Trade Bot Started ---")
    print(f"Target: {SYMBOL}, TP/SL: {TP_SL_POINTS} points")

    while True:
        print(f"\nScanning accounts at {datetime.now().strftime('%H:%M:%S')}...")
        participants = get_participants()
        
        for p in participants:
            process_account(p)
            time.sleep(1) # Short pause between accounts
            
        print(f"Sleeping {CHECK_INTERVAL}s...")
        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        mt5.shutdown()
