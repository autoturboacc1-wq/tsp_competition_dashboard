export type TradeHistory = {
  symbol: string;
  type: 'BUY' | 'SELL';
  lot: number;
  profit: number;
  openTime: string;
  closeTime: string;
};

export type TraderStats = {
  winRate: number; // Percentage 0-100
  profitFactor: number;
  rrRatio: number;
  maxDrawdown: number; // Percentage 0-100
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  bestTrade?: number;
  worstTrade?: number;
  winRateBuy?: number;
  winRateSell?: number;
  tradingStyle?: string;
  favoritePair?: string;
  avgHoldingTime?: string;
  avgHoldingTimeWin?: string;
  avgHoldingTimeLoss?: string;
  maxConsecutiveWins?: number;
  maxConsecutiveLosses?: number;
  sessionAsianProfit?: number;
  sessionLondonProfit?: number;
  sessionNewYorkProfit?: number;
  sessionAsianWinRate?: number;
  sessionLondonWinRate?: number;
  sessionNewYorkWinRate?: number;
};

export type LeaderboardEntry = {
  id: string;
  nickname: string;
  points: number;
  profit: number;
  stats: TraderStats;
  equityCurve: number[]; // Array of balance points for chart
  history: TradeHistory[];
  dailyHistory?: { date: string; profit: number }[];
  // MyFxBook-style detailed equity snapshots
  equitySnapshots?: Array<{
    time: number;
    balance: number;
    equity: number;
    floatingPL: number;
  }>;
};

// Helper to generate random history
function generateHistory(count: number): TradeHistory[] {
  const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'US30'];
  const types: ('BUY' | 'SELL')[] = ['BUY', 'SELL'];

  return Array.from({ length: count }).map((_, i) => ({
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    type: types[Math.floor(Math.random() * types.length)],
    lot: Number((Math.random() * 5 + 0.1).toFixed(2)),
    profit: Number((Math.random() * 2000 - 800).toFixed(2)),
    openTime: new Date(Date.now() - (count - i) * 3600000).toISOString(),
    closeTime: new Date(Date.now() - (count - i) * 3600000 + 1800000).toISOString(),
  })).reverse(); // Newest first
}

// Helper to generate equity curve
function generateEquity(startBalance: number, count: number): number[] {
  let balance = startBalance;
  const curve = [balance];
  for (let i = 0; i < count; i++) {
    balance += (Math.random() - 0.45) * 500; // Slight upward trend bias
    curve.push(Number(balance.toFixed(2)));
  }
  return curve;
}

// Helper to generate daily history
function generateDailyHistory(count: number): { date: string; profit: number }[] {
  return Array.from({ length: count }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    return {
      date: date.toISOString().split('T')[0],
      profit: Number((Math.random() * 1000 - 400).toFixed(2))
    };
  });
}

export const leaderboardData: LeaderboardEntry[] = [
  {
    id: '1',
    nickname: 'TraderPro99',
    points: 1500,
    profit: 1200.50,
    stats: {
      winRate: 65.5,
      profitFactor: 2.1,
      rrRatio: 1.5,
      maxDrawdown: 12.5,
      totalTrades: 145,
      avgWin: 150,
      avgLoss: -80,
      bestTrade: 500,
      worstTrade: -200,
      winRateBuy: 60,
      winRateSell: 70,
      tradingStyle: 'Intraday',
      favoritePair: 'XAUUSD',
      avgHoldingTime: '2h 30m',
      avgHoldingTimeWin: '1h 15m',
      avgHoldingTimeLoss: '3h 45m',
      maxConsecutiveWins: 5,
      maxConsecutiveLosses: 2,
      sessionAsianProfit: 150.50,
      sessionLondonProfit: 500.00,
      sessionNewYorkProfit: -200.00,
      sessionAsianWinRate: 60,
      sessionLondonWinRate: 75,
      sessionNewYorkWinRate: 40
    },
    equityCurve: generateEquity(10000, 20),
    history: generateHistory(10),
    dailyHistory: generateDailyHistory(30)
  },
  {
    id: '2',
    nickname: 'CryptoKing',
    points: 1450,
    profit: 980.00,
    stats: { winRate: 55.0, profitFactor: 1.8, rrRatio: 1.2, maxDrawdown: 25.0, totalTrades: 89, avgWin: 200, avgLoss: -150 },
    equityCurve: generateEquity(10000, 20),
    history: generateHistory(10),
    dailyHistory: generateDailyHistory(30)
  },
  {
    id: '3',
    nickname: 'MoonWalker',
    points: 1400,
    profit: -150.00,
    stats: { winRate: 40.0, profitFactor: 0.8, rrRatio: 0.7, maxDrawdown: 45.0, totalTrades: 200, avgWin: 50, avgLoss: -60 },
    equityCurve: generateEquity(10000, 20),
    history: generateHistory(10),
    dailyHistory: generateDailyHistory(30)
  },
  {
    id: '4',
    nickname: 'HODLer',
    points: 1350,
    profit: 500.25,
    stats: { winRate: 50.0, profitFactor: 1.2, rrRatio: 1.1, maxDrawdown: 10.0, totalTrades: 50, avgWin: 100, avgLoss: -90 },
    equityCurve: generateEquity(10000, 20),
    history: generateHistory(10),
    dailyHistory: generateDailyHistory(30)
  },
  {
    id: '5',
    nickname: 'BearWhale',
    points: 1300,
    profit: 2000.00,
    stats: { winRate: 70.0, profitFactor: 3.5, rrRatio: 2.5, maxDrawdown: 5.0, totalTrades: 30, avgWin: 500, avgLoss: -100 },
    equityCurve: generateEquity(10000, 20),
    history: generateHistory(10),
    dailyHistory: generateDailyHistory(30)
  },
  // ... Adding more simple entries to fill the list
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: String(i + 6),
    nickname: `Trader_${i + 6}`,
    points: 1000 - i * 50,
    profit: Number((Math.random() * 2000 - 1000).toFixed(2)),
    stats: {
      winRate: Number((Math.random() * 100).toFixed(1)),
      profitFactor: Number((Math.random() * 3).toFixed(2)),
      rrRatio: Number((Math.random() * 3).toFixed(2)),
      maxDrawdown: Number((Math.random() * 50).toFixed(1)),
      totalTrades: Math.floor(Math.random() * 100),
      avgWin: 100,
      avgLoss: -50,
      bestTrade: 200,
      worstTrade: -100,
      winRateBuy: 50,
      winRateSell: 50,
      tradingStyle: 'Scalping',
      favoritePair: 'EURUSD',
      avgHoldingTime: '15m'
    },
    equityCurve: generateEquity(10000, 20),
    history: generateHistory(5),
    dailyHistory: generateDailyHistory(30)
  }))
];
