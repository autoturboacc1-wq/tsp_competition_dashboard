import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

supabase: Client = create_client(url, key)

def generate_test_file():
    print("Fetching latest trade...")
    # Fetch latest trade
    trade_response = supabase.table('trades').select('*').order('open_time', desc=True).limit(1).execute()
    if not trade_response.data:
        print("No trades found.")
        return

    trade = trade_response.data[0]
    print(f"Found trade: {trade['symbol']} at {trade['open_time']}")

    # Fetch market data
    symbol = trade['symbol'].replace('.s', '')
    print(f"Fetching market data for {symbol}...")
    
    candles_response = supabase.table('market_data') \
        .select('*') \
        .eq('symbol', symbol) \
        .order('time', desc=True) \
        .limit(1000) \
        .execute()

    if not candles_response.data:
        print("No market data found.")
        return

    # Reverse to get chronological order
    candles = candles_response.data[::-1]
    print(f"Fetched {len(candles)} candles.")

    # Prepare data for HTML
    raw_data = {
        "trade": trade,
        "candles": candles
    }

    # HTML Template (Based on chart_test.html but simplified for this test)
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Real Data Chart Test (Generated)</title>
    <script src="https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"></script>
    <style>
        body {{ background-color: #111827; color: #e5e7eb; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; height: 100vh; margin: 0; }}
        #chart {{ width: 90%; height: 600px; border: 1px solid #374151; border-radius: 8px; overflow: hidden; }}
        .info {{ margin: 1rem; text-align: center; }}
    </style>
</head>
<body>
    <div class="info">
        <h2>{trade['symbol']} ({trade['type']})</h2>
        <p>Open: {trade['open_price']} | Profit: {trade['profit']}</p>
        <p>Data Points: {len(candles)}</p>
    </div>
    <div id="chart"></div>
    <script>
        const rawData = {json.dumps(raw_data)};
        const trade = rawData.trade;
        const candles = rawData.candles.map(c => ({{
            time: new Date(c.time).getTime() / 1000,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
        }}));

        const chart = LightweightCharts.createChart(document.getElementById('chart'), {{
            layout: {{ background: {{ type: 'solid', color: '#111827' }}, textColor: '#D1D5DB' }},
            grid: {{ vertLines: {{ color: '#374151' }}, horzLines: {{ color: '#374151' }} }},
            timeScale: {{ timeVisible: true, secondsVisible: false }},
        }});

        const series = chart.addCandlestickSeries({{
            upColor: '#10B981', downColor: '#EF4444', borderVisible: false, wickUpColor: '#10B981', wickDownColor: '#EF4444'
        }});

        series.setData(candles);

        // Entry Line
        const entryLine = chart.addLineSeries({{ color: '#3B82F6', lineWidth: 2, lineStyle: 2, title: 'Entry' }});
        entryLine.setData([
            {{ time: candles[0].time, value: trade.open_price }},
            {{ time: candles[candles.length - 1].time, value: trade.open_price }}
        ]);

        chart.timeScale().fitContent();
    </script>
</body>
</html>"""

    output_path = "bridge/real_chart_test.html"
    with open(output_path, "w") as f:
        f.write(html_content)
    
    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    generate_test_file()
