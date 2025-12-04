# Elite Gold Competition Platform

A premium, automated trading competition platform built with SvelteKit, Supabase, and Python.

![Elite Gold Logo](/static/logo.png)

## 🌟 Features

*   **Real-time Leaderboard**: Automatically updates ranking based on Points, Profit, and Equity.
*   **Premium UI**: "Black & Gold" theme designed for a professional look.
*   **PWA Support**: Installable on iOS and Android as a native-like app.
*   **Automated Data Sync**: Python bridge connects to MetaTrader 5 (MT5) to fetch trading data 24/7.
*   **Detailed Analytics**: Individual trader profiles with equity curves and trade history.

## 🛠 Tech Stack

*   **Frontend**: SvelteKit, TailwindCSS
*   **Backend**: Supabase (PostgreSQL, Auth, Realtime)
*   **Data Bridge**: Python 3.10+, MetaTrader5 API
*   **Deployment**: Vercel (Frontend), Windows VPS (Bridge)

## 🚀 Getting Started

### 1. Database Setup (Supabase)

1.  Create a project at [supabase.com](https://supabase.com).
2.  Run the SQL script located in `schema.sql` in the Supabase SQL Editor.
3.  Get your **Project URL**, **Anon Key**, and **Service Role Key**.

### 2. Frontend Setup

1.  Clone the repo:
    ```bash
    git clone <repo-url>
    cd TSP-Competition
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment:
    -   Copy `.env.example` to `.env`.
    -   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4.  Run locally:
    ```bash
    npm run dev
    ```

### 3. Bridge Setup (Windows Required)

The bridge script must run on a Windows machine (or VPS) with MetaTrader 5 installed.

1.  Navigate to the bridge directory:
    ```bash
    cd bridge
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Configure Bridge Environment:
    -   Copy `.env.example` to `.env`.
    -   Fill in `SUPABASE_URL`, `SUPABASE_KEY` (Service Role), and Telegram credentials.
4.  Import Participants:
    -   Create `participants.csv` from the example.
    -   Run `python import_participants.py`.
5.  Start the Bridge:
    ```bash
    python main.py
    ```

## 📦 Deployment

*   **Frontend**: Connect your GitHub repo to **Vercel**. Add the Environment Variables in Vercel settings.
*   **Bridge**: Rent a Windows VPS, install MT5 and Python, and run `main.py` as a background service (e.g., using NSSM).

## 🔔 Observability

The bridge sends notifications to Telegram for:
*   Startup/Shutdown events
*   Sync errors
*   Critical failures

Configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `bridge/.env` to enable this.
