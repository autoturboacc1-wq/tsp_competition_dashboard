import { supabase } from '$lib/supabase';
import { leaderboardData } from '$lib/mock/leaderboard';
import { createAsyncMeta, formatSupabaseLoadError } from '$lib/async-state';
import { getCached, setCache } from '$lib/cache';
import type { PageServerLoad } from './$types';

const CACHE_KEY = 'leaderboard';
const CACHE_TTL = 15_000; // 15 seconds

export const load: PageServerLoad = async () => {
    // Check cache first
    const cached = getCached<any>(CACHE_KEY);
    if (cached) return cached;

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

            // Calculate yesterday's rankings for rank change
            const latestDate = sortedData[0]?.date;
            const uniqueDates = [...new Set(data.map(e => e.date))].sort().reverse();
            const previousDate = uniqueDates.find(d => d < latestDate);

            const previousRankMap = new Map<string, number>();
            if (previousDate) {
                const previousEntries = data
                    .filter(e => e.date === previousDate)
                    .sort((a, b) => b.points - a.points || b.profit - a.profit);
                previousEntries.forEach((entry, idx) => {
                    previousRankMap.set(entry.participant_id, idx + 1);
                });
            }

            const result = {
                ...createAsyncMeta(),
                leaderboard: sortedData.map((entry, idx) => {
                    const currentRank = idx + 1;
                    const previousRank = previousRankMap.get(entry.participant_id);
                    const rankChange = previousRank != null ? previousRank - currentRank : 0;

                    return {
                        id: entry.participant_id,
                        nickname: entry.participants?.nickname || 'Unknown',
                        points: entry.points,
                        profit: entry.profit,
                        rankChange,
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
                        history: [],
                        equityCurve: []
                    };
                })
            };
            setCache(CACHE_KEY, result, CACHE_TTL);
            return result;
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
