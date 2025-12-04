-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Participants Table
create table public.participants (
  id uuid primary key default uuid_generate_v4(),
  nickname text not null,
  avatar_url text,
  account_id text unique, -- MT4/MT5 Login
  investor_password text, -- Read-only password
  server text, -- Broker Server Name
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Daily Stats Table (For Leaderboard & Graphs)
create table public.daily_stats (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid references public.participants(id) on delete cascade not null,
  date date not null,
  balance numeric not null,
  equity numeric not null,
  profit numeric not null,
  points integer not null,
  win_rate numeric,
  max_drawdown numeric,
  profit_factor numeric,
  rr_ratio numeric,
  total_trades integer,
  avg_win numeric,
  avg_loss numeric,
  trading_style text,
  favorite_pair text,
  avg_holding_time text,
  best_trade numeric,
  worst_trade numeric,
  win_rate_buy numeric,
  win_rate_sell numeric,
  avg_holding_time_win text,
  avg_holding_time_loss text,
  max_consecutive_wins integer,
  max_consecutive_losses integer,
  session_asian_profit numeric,
  session_london_profit numeric,
  session_newyork_profit numeric,
  session_asian_win_rate numeric,
  session_london_win_rate numeric,
  session_newyork_win_rate numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(participant_id, date)
);

-- 3. Trades Table (For History)
create table public.trades (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid references public.participants(id) on delete cascade not null,
  symbol text not null,
  type text not null, -- 'BUY' or 'SELL'
  lot_size numeric not null,
  open_price numeric not null,
  close_price numeric not null,
  open_time timestamp with time zone not null,
  close_time timestamp with time zone not null,
  profit numeric not null,
  sl numeric,
  tp numeric,
  position_id bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(participant_id, position_id)
);

-- 4. Market Data Table (For Charts)
create table public.market_data (
  symbol text not null,
  time timestamp with time zone not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint,
  primary key (symbol, time)
);

-- Row Level Security (RLS)
alter table public.participants enable row level security;
alter table public.daily_stats enable row level security;
alter table public.trades enable row level security;
alter table public.market_data enable row level security;

-- Policies (Public Read, Admin Write)
-- Note: 'service_role' key bypasses RLS, so we just need to ensure public can read.
create policy "Allow public read access on participants"
  on public.participants for select using (true);

create policy "Allow public read access on daily_stats"
  on public.daily_stats for select using (true);

create policy "Allow public read access on trades"
  on public.trades for select using (true);

create policy "Allow public read access on market_data"
  on public.market_data for select using (true);
