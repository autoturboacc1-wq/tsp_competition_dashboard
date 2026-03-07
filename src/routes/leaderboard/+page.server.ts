import { supabase } from '$lib/supabase';
import { leaderboardData } from '$lib/mock/leaderboard';
import { createAsyncMeta, formatSupabaseLoadError } from '$lib/async-state';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const { data, error } = await supabase
            .from('daily_stats')
            .select(`
                *,
                participants (nickname, avatar_url)
            `)
            .order('date', { ascending: false })
            .order('points', { ascending: false });

        if (error) {
            throw error;
        }

        if (data && data.length > 0) {
            // Filter to keep only the latest entry per participant
            const latestEntries = new Map();
            data.forEach(entry => {
                if (!latestEntries.has(entry.participant_id)) {
                    latestEntries.set(entry.participant_id, entry);
                }
            });

            const sortedData = Array.from(latestEntries.values()).sort((a, b) => b.points - a.points);

            return {
                ...createAsyncMeta(),
                leaderboard: sortedData.map(entry => ({
                    id: entry.participant_id,
                    nickname: entry.participants?.nickname || 'Unknown',
                    points: entry.points,
                    profit: entry.profit,
                    balance: entry.balance,
                    equity: entry.equity,
                    stats: {
                        winRate: entry.win_rate,
                        profitFactor: entry.profit_factor,
                        rrRatio: entry.rr_ratio || 0,
                        maxDrawdown: entry.max_drawdown || 0,
                        totalTrades: entry.total_trades,
                        avgWin: entry.avg_win,
                        avgLoss: entry.avg_loss
                    },
                    history: [], // List view doesn't need history
                    equityCurve: [] // List view doesn't need curve
                }))
            };
        }

        return {
            ...createAsyncMeta(),
            leaderboard: []
        };
    } catch (e) {
        console.error('Supabase fetch failed, falling back to mock data:', e);
    }

    return {
        ...createAsyncMeta({
            loadError: formatSupabaseLoadError('ตารางคะแนน', undefined),
            isFallbackData: true
        }),
        leaderboard: leaderboardData
    };
};
