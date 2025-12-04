import { supabase } from '$lib/supabase';
import { error } from '@sveltejs/kit';
import { leaderboardData } from '$lib/mock/leaderboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const { id } = params;

    // Phase 2: Fetch from Supabase
    try {
        const { data: participant, error: pError } = await supabase
            .from('participants')
            .select('*')
            .eq('id', id)
            .single();

        if (!pError && participant) {
            // Fetch latest stats
            const { data: stats } = await supabase
                .from('daily_stats')
                .select('*')
                .eq('participant_id', id)
                .order('date', { ascending: false })
                .limit(1)
                .single();

            // Fetch history
            const { data: history } = await supabase
                .from('trades')
                .select('*')
                .eq('participant_id', id)
                .order('close_time', { ascending: false })
                .limit(50);

            // Fetch equity curve (all daily stats)
            const { data: equityData } = await supabase
                .from('daily_stats')
                .select('equity')
                .eq('participant_id', id)
                .order('date', { ascending: true });

            return {
                trader: {
                    id: participant.id,
                    nickname: participant.nickname,
                    points: stats?.points || 0,
                    profit: stats?.profit || 0,
                    stats: {
                        winRate: stats?.win_rate || 0,
                        profitFactor: stats?.profit_factor || 0,
                        maxDrawdown: stats?.max_drawdown || 0,
                        totalTrades: stats?.total_trades || 0,
                        avgWin: stats?.avg_win || 0,
                        avgLoss: stats?.avg_loss || 0,
                        tradingStyle: stats?.trading_style || 'Unknown',
                        favoritePair: stats?.favorite_pair || '-',
                        avgHoldingTime: stats?.avg_holding_time || '-'
                    },
                    equityCurve: equityData?.map(d => d.equity) || [],
                    history: history?.map(h => ({
                        symbol: h.symbol,
                        type: h.type,
                        lot: h.lot_size,
                        profit: h.profit,
                        openTime: h.open_time,
                        closeTime: h.close_time
                    })) || []
                },
                rank: 0 // Rank calculation requires fetching all participants, skipping for now
            };
        }
    } catch (e) {
        console.error('Supabase fetch failed, falling back to mock data:', e);
    }

    // Fallback to mock data
    const traderIndex = leaderboardData.findIndex((t) => t.id === id);
    if (traderIndex === -1) {
        throw error(404, 'Trader not found');
    }

    const trader = leaderboardData[traderIndex];
    const rank = traderIndex + 1;

    return {
        trader,
        rank
    };
};
