import { supabase } from '$lib/supabase';
import { THAILAND_OFFSET_MS } from '$lib/timezone';
import { error } from '@sveltejs/kit';
import { leaderboardData } from '$lib/mock/leaderboard';
import {
    buildPartialFailureMessage,
    createAsyncMeta,
    formatSupabaseLoadError
} from '$lib/async-state';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const { id } = params;
    const mockTraderIndex = leaderboardData.findIndex((t) => t.id === id);
    const mockTrader = mockTraderIndex === -1 ? null : leaderboardData[mockTraderIndex];

    try {
        const { data: participant, error: pError } = await supabase
            .from('participants')
            .select('*')
            .eq('id', id)
            .single();

        if (pError || !participant) {
            throw pError || new Error('Participant not found');
        }

        const partialFailures: string[] = [];

        const { data: stats, error: statsError } = await supabase
                .from('daily_stats')
                .select('*')
                .eq('participant_id', id)
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

        if (statsError) {
            partialFailures.push(buildPartialFailureMessage('สถิติหลัก'));
        }

        const optionalResults = await Promise.allSettled([
            supabase
                .from('trades')
                .select('*')
                .eq('participant_id', id)
                .order('close_time', { ascending: false })
                .limit(50),
            supabase
                .from('daily_stats')
                .select('equity, date')
                .eq('participant_id', id)
                .order('date', { ascending: true }),
            supabase
                .from('equity_snapshots')
                .select('timestamp, balance, equity, floating_pl')
                .eq('participant_id', id)
                .order('timestamp', { ascending: false })
                .limit(10000),
            supabase
                .from('trades')
                .select('close_time, profit')
                .eq('participant_id', id)
                .order('close_time', { ascending: true }),
            stats?.date
                ? supabase
                      .from('daily_stats')
                      .select('points, profit')
                      .eq('date', stats.date)
                : Promise.resolve({ data: null, error: null }),
            supabase
                .from('achievements')
                .select('badge_type, badge_label, description, earned_at')
                .eq('participant_id', id)
                .order('earned_at', { ascending: true })
        ]);

        const [historyResult, equityResult, snapshotResult, allTradesResult, rankResult, badgesResult] =
            optionalResults;

        const getResultData = <T>(
            result: PromiseSettledResult<{ data: T; error: any }>,
            failureLabel: string,
            fallbackValue: T,
        ): T => {
            if (result.status === 'rejected') {
                partialFailures.push(buildPartialFailureMessage(failureLabel));
                return fallbackValue;
            }

            if (result.value.error) {
                partialFailures.push(buildPartialFailureMessage(failureLabel));
                return fallbackValue;
            }

            return (result.value.data as T) ?? fallbackValue;
        };

        const history = getResultData(historyResult, 'ประวัติการเทรด', []);
        const equityData = getResultData(equityResult, 'ข้อมูล equity', []);
        const equitySnapshotsDesc = getResultData(snapshotResult, 'กราฟ equity แบบละเอียด', []);
        const allTrades = getResultData(allTradesResult, 'ปฏิทินการเทรด', []);
        const allStats = getResultData(rankResult, 'อันดับล่าสุด', null as any);
        const badges = getResultData(badgesResult, 'เหรียญรางวัล', []);

        const equitySnapshots = equitySnapshotsDesc?.reverse?.() || [];

        const dailyStatsFromTrades = (() => {
            if (!allTrades || allTrades.length === 0) return [];

            const dailyMap = new Map<string, {
                profit: number;
                trades: number[];
            }>();

            for (const trade of allTrades) {
                const closeTime = new Date(trade.close_time);
                const thaiTime = new Date(closeTime.getTime() + THAILAND_OFFSET_MS);
                const dateKey = thaiTime.toISOString().split('T')[0];

                if (!dailyMap.has(dateKey)) {
                    dailyMap.set(dateKey, { profit: 0, trades: [] });
                }
                const day = dailyMap.get(dateKey)!;
                day.profit += trade.profit || 0;
                day.trades.push(trade.profit || 0);
            }

            return Array.from(dailyMap.entries()).map(([date, data]) => {
                const wins = data.trades.filter(p => p > 0);
                const losses = data.trades.filter(p => p < 0);
                return {
                    date,
                    profit: data.profit,
                    totalTrades: data.trades.length,
                    winRate: data.trades.length > 0 ? (wins.length / data.trades.length) * 100 : 0,
                    bestTrade: wins.length > 0 ? Math.max(...wins) : 0,
                    worstTrade: losses.length > 0 ? Math.min(...losses) : 0
                };
            }).sort((a, b) => a.date.localeCompare(b.date));
        })();

        const rank = (() => {
            if (!stats || !allStats) return 0;

            const betterStats = allStats.filter((s: { points: number; profit: number }) =>
                s.points > stats.points ||
                (s.points === stats.points && s.profit > stats.profit)
            );

            return betterStats.length + 1;
        })();

        return {
            ...createAsyncMeta({
                partialFailures
            }),
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
                    rrRatio: stats?.rr_ratio || 0,
                    bestTrade: stats?.best_trade || 0,
                    worstTrade: stats?.worst_trade || 0,
                    winRateBuy: stats?.win_rate_buy || 0,
                    winRateSell: stats?.win_rate_sell || 0,
                    tradingStyle: stats?.trading_style || 'Unknown',
                    favoritePair: stats?.favorite_pair || '-',
                    avgHoldingTime: stats?.avg_holding_time || '-',
                    avgHoldingTimeWin: stats?.avg_holding_time_win || '-',
                    avgHoldingTimeLoss: stats?.avg_holding_time_loss || '-',
                    maxConsecutiveWins: stats?.max_consecutive_wins || 0,
                    maxConsecutiveLosses: stats?.max_consecutive_losses || 0,
                    sessionAsianProfit: stats?.session_asian_profit || 0,
                    sessionLondonProfit: stats?.session_london_profit || 0,
                    sessionNewYorkProfit: stats?.session_newyork_profit || 0,
                    sessionAsianWinRate: stats?.session_asian_win_rate || 0,
                    sessionLondonWinRate: stats?.session_london_win_rate || 0,
                    sessionNewYorkWinRate: stats?.session_newyork_win_rate || 0
                },
                equityCurve: equityData?.map((d: { equity: number }) => d.equity) || [],
                history: history?.map((t: any) => ({
                    id: t.id,
                    symbol: t.symbol,
                    type: t.type,
                    lot: t.lot_size,
                    openPrice: t.open_price,
                    closePrice: t.close_price,
                    sl: t.sl,
                    tp: t.tp,
                    openTime: t.open_time,
                    closeTime: t.close_time,
                    profit: t.profit
                })) || [],
                dailyHistory: dailyStatsFromTrades,
                equitySnapshots: equitySnapshots?.map((s: any) => ({
                    time: new Date(s.timestamp).getTime() / 1000,
                    balance: s.balance,
                    equity: s.equity,
                    floatingPL: s.floating_pl || 0
                })) || []
            },
            rank,
            badges
        };
    } catch (e) {
        console.error('Supabase fetch failed:', e);
    }

    if (!mockTrader) {
        throw error(404, 'Trader not found');
    }

    return {
        ...createAsyncMeta({
            loadError: formatSupabaseLoadError('ข้อมูลเทรดเดอร์', undefined),
            isFallbackData: true
        }),
        trader: mockTrader,
        rank: mockTraderIndex + 1
    };
};
