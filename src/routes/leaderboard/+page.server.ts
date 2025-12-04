import { supabase } from '$lib/supabase';
import { leaderboardData } from '$lib/mock/leaderboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Phase 2: Fetch from Supabase
    try {
        const { data, error } = await supabase
            .from('daily_stats')
            .select(`
                *,
                participants (nickname, avatar_url)
            `)
            .order('points', { ascending: false });

        if (!error && data && data.length > 0) {
            return {
                leaderboard: data.map(entry => ({
                    id: entry.participant_id,
                    nickname: entry.participants?.nickname || 'Unknown',
                    points: entry.points,
                    profit: entry.profit,
                    balance: entry.balance,
                    equity: entry.equity,
                    stats: {
                        winRate: entry.win_rate,
                        profitFactor: entry.profit_factor,
                        maxDrawdown: 0, // Not yet in daily_stats, maybe add later
                        totalTrades: entry.total_trades,
                        avgWin: entry.avg_win,
                        avgLoss: entry.avg_loss
                    },
                    history: [], // List view doesn't need history
                    equityCurve: [] // List view doesn't need curve
                }))
            };
        }
    } catch (e) {
        console.error('Supabase fetch failed, falling back to mock data:', e);
    }

    // Fallback to mock data until DB is ready or if fetch fails
    return {
        leaderboard: leaderboardData
    };
};
