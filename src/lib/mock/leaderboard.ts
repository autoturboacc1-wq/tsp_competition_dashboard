import type { LeaderboardEntry } from '$lib/mock/leaderboard';

export type LeaderboardEntry = {
  id: string;
  nickname: string;
  points: number;
  profit: number;
};

export const leaderboardData: LeaderboardEntry[] = [
  { id: '1', nickname: 'TraderPro99', points: 1500, profit: 1200.50 },
  { id: '2', nickname: 'CryptoKing', points: 1450, profit: 980.00 },
  { id: '3', nickname: 'MoonWalker', points: 1400, profit: -150.00 },
  { id: '4', nickname: 'HODLer', points: 1350, profit: 500.25 },
  { id: '5', nickname: 'BearWhale', points: 1300, profit: 2000.00 },
  { id: '6', nickname: 'SatoshiFan', points: 1250, profit: 100.00 },
  { id: '7', nickname: 'DogeMaster', points: 1200, profit: -50.00 },
  { id: '8', nickname: 'ElonMusk', points: 1150, profit: 3000.00 },
  { id: '9', nickname: 'VitalikB', points: 1100, profit: 150.00 },
  { id: '10', nickname: 'DiamondHands', points: 1050, profit: -200.00 },
  { id: '11', nickname: 'PaperHands', points: 1000, profit: -500.00 },
  { id: '12', nickname: 'ToTheMoon', points: 950, profit: 50.00 },
  { id: '13', nickname: 'RektCity', points: 900, profit: -1000.00 },
  { id: '14', nickname: 'BullRun', points: 850, profit: 750.00 },
  { id: '15', nickname: 'BearMarket', points: 800, profit: -300.00 }
];
