# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "MetaTrader5",
#     "python-dotenv",
# ]
# ///
"""
Debug: show deal.profit, deal.commission, deal.swap for each account
to verify if commission/swap are already included in deal.profit.
"""

import os
import csv
import MetaTrader5 as mt5
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

mt5_path = os.getenv("MT5_PATH")
if mt5_path:
    mt5.initialize(path=mt5_path)
else:
    mt5.initialize()

csv_file = "participants.csv"
with open(csv_file) as f:
    participants = list(csv.DictReader(f))

# Check just first 2 participants to keep output manageable
for p in participants[:2]:
    nickname = p['nickname']
    login = int(p['account_id'])
    password = p['investor_password']
    server = p['server']

    print(f"\n{'='*80}")
    print(f"  {nickname} - Login: {login}, Server: {server}")
    print(f"{'='*80}")

    if not mt5.login(login, password=password, server=server):
        print(f"  Login failed: {mt5.last_error()}")
        continue

    account = mt5.account_info()
    print(f"  Balance: {account.balance}, Equity: {account.equity}")

    deals = mt5.history_deals_get(datetime(2020, 1, 1, tzinfo=timezone.utc), datetime.now(timezone.utc))

    if not deals:
        print("  No deals found")
        continue

    print(f"\n  {'Ticket':<12} {'Entry':<6} {'Symbol':<14} {'Profit':>10} {'Commission':>12} {'Swap':>8} {'Net':>12}")
    print(f"  {'-'*74}")

    total_profit = 0
    total_commission = 0
    total_swap = 0

    for d in deals:
        if d.entry == mt5.DEAL_ENTRY_OUT or d.entry == mt5.DEAL_ENTRY_INOUT:
            net = d.profit + d.commission + d.swap
            total_profit += d.profit
            total_commission += d.commission
            total_swap += d.swap
            print(f"  {d.ticket:<12} {d.entry:<6} {d.symbol:<14} {d.profit:>10.2f} {d.commission:>12.2f} {d.swap:>8.2f} {net:>12.2f}")

    total_net = total_profit + total_commission + total_swap
    print(f"  {'-'*74}")
    print(f"  {'TOTALS':<34} {total_profit:>10.2f} {total_commission:>12.2f} {total_swap:>8.2f} {total_net:>12.2f}")
    print(f"\n  Balance: {account.balance}")
    print(f"  sum(deal.profit) only:           {total_profit:.2f}")
    print(f"  sum(profit+commission+swap):     {total_net:.2f}")

mt5.shutdown()
