import { supabase } from '$lib/supabase';
import { getTodayDateThai } from '$lib/timezone';
import { getCached, setCache } from '$lib/cache';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const CACHE_KEY = 'dashboard';
const CACHE_TTL = 60_000; // 60 seconds

type SentimentRow = {
    symbol: string;
    buyLots: number;
    sellLots: number;
    buyCount: number;
    sellCount: number;
};

type SentimentStatus = 'ready' | 'empty' | 'unavailable';

function aggregateSentimentBySymbol(openPositions: Array<{ symbol: string; type: string; lot_size: number | string | null }>): SentimentRow[] {
    const sentimentMap = new Map<string, SentimentRow>();

    for (const position of openPositions) {
        if (!position.symbol) continue;

        if (!sentimentMap.has(position.symbol)) {
            sentimentMap.set(position.symbol, {
                symbol: position.symbol,
                buyLots: 0,
                sellLots: 0,
                buyCount: 0,
                sellCount: 0
            });
        }

        const entry = sentimentMap.get(position.symbol)!;
        const lotSize = Number(position.lot_size) || 0;

        if (position.type === 'BUY') {
            entry.buyLots += lotSize;
            entry.buyCount += 1;
        } else if (position.type === 'SELL') {
            entry.sellLots += lotSize;
            entry.sellCount += 1;
        }
    }

    return [...sentimentMap.values()].sort(
        (a, b) => (b.buyCount + b.sellCount) - (a.buyCount + a.sellCount) || a.symbol.localeCompare(b.symbol)
    );
}

export const load: PageServerLoad = async () => {
    const cached = getCached<any>(CACHE_KEY);
    if (cached) return { ...cached, telegramBotUsername: env.TELEGRAM_BOT_USERNAME || '' };

    try {
        const thaiDate = getTodayDateThai();

        // First: get the earliest date (for competition days) and try today's stats
        const [todayStatsResult, recentTradesResult, dateRangeResult, openPositionsResult] = await Promise.all([
            // Query 1: Today's daily_stats only
            supabase
                .from('daily_stats')
                .select('participant_id, date, balance, equity, profit, points, win_rate, total_trades, total_lots, participants(nickname, avatar_url)')
                .eq('date', thaiDate),

            // Query 2: Recent trades
            supabase
                .from('trades')
                .select('id, participant_id, symbol, type, lot_size, profit, close_time, participants(nickname)')
                .not('close_time', 'is', null)
                .order('close_time', { ascending: false })
                .limit(15),

            // Query 3: Competition date range (first + last date)
            supabase
                .from('daily_stats')
                .select('date')
                .order('date', { ascending: true })
                .limit(1),

            // Query 4: Open trades for sentiment board
            supabase
                .from('open_positions')
                .select('symbol, type, lot_size')
        ]);

        let latestArray = todayStatsResult.data || [];
        const recentTrades = recentTradesResult.data || [];
        const firstDate = dateRangeResult.data?.[0]?.date || thaiDate;

        let sentimentStatus: SentimentStatus = 'empty';
        let sentimentBySymbol: SentimentRow[] = [];
        if (openPositionsResult.error) {
            sentimentStatus = 'unavailable';
            console.error('Open positions fetch failed:', openPositionsResult.error);
        } else {
            sentimentBySymbol = aggregateSentimentBySymbol(openPositionsResult.data || []);
            sentimentStatus = sentimentBySymbol.length > 0 ? 'ready' : 'empty';
        }

        // Fallback: if no data for today, get the latest date's stats
        if (latestArray.length === 0) {
            const { data: latestDateRow } = await supabase
                .from('daily_stats')
                .select('date')
                .order('date', { ascending: false })
                .limit(1);

            const latestDate = latestDateRow?.[0]?.date;
            if (latestDate) {
                const { data } = await supabase
                    .from('daily_stats')
                    .select('participant_id, date, balance, equity, profit, points, win_rate, total_trades, total_lots, participants(nickname, avatar_url)')
                    .eq('date', latestDate);
                latestArray = data || [];
            }
        }

        // Summary stats
        const totalParticipants = latestArray.length;
        const totalTrades = latestArray.reduce((sum, e) => sum + (e.total_trades || 0), 0);
        const totalVolume = latestArray.reduce((sum, e) => sum + (e.total_lots || 0), 0);
        const averageWinRate =
            totalParticipants > 0
                ? latestArray.reduce((sum, e) => sum + (e.win_rate || 0), 0) / totalParticipants
                : 0;

        // Top performer from latest data
        let topPerformer = null;
        const topEntry = [...latestArray].sort((a, b) => b.profit - a.profit)[0];

        if (topEntry) {
            topPerformer = {
                participantId: topEntry.participant_id,
                nickname: (topEntry.participants as any)?.nickname || 'Unknown',
                profit: topEntry.profit,
                points: topEntry.points,
                date: topEntry.date,
                isToday: topEntry.date === thaiDate
            };
        }

        // Most active trader
        const sortedByTrades = [...latestArray].sort(
            (a, b) => (b.total_trades || 0) - (a.total_trades || 0)
        );
        const mostActive = sortedByTrades[0];

        // Mini leaderboard top 5
        const topFive = [...latestArray]
            .sort((a, b) => b.points - a.points)
            .slice(0, 5)
            .map((entry) => ({
                id: entry.participant_id,
                nickname: (entry.participants as any)?.nickname || 'Unknown',
                points: entry.points,
                profit: entry.profit
            }));

        // All participants ranked (for stock ticker/board)
        const allParticipants = [...latestArray]
            .sort((a, b) => b.points - a.points)
            .map((entry, index) => ({
                rank: index + 1,
                id: entry.participant_id,
                nickname: (entry.participants as any)?.nickname || 'Unknown',
                points: entry.points,
                profit: entry.profit,
                winRate: entry.win_rate ?? 0
            }));

        // Competition days
        const startDate = new Date(firstDate);
        const todayDate = new Date(thaiDate);
        const totalDays = Math.max(1, Math.ceil((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        // Participants list for Telegram linking
        const participants = latestArray.map((entry: any) => ({
            id: entry.participant_id,
            nickname: (entry.participants as any)?.nickname || 'Unknown'
        }));

        const result = {
            summary: {
                totalParticipants,
                totalTrades,
                totalVolume: Math.round(totalVolume * 100) / 100,
                averageWinRate: Math.round(averageWinRate * 100) / 100
            },
            topPerformer,
            recentTrades: recentTrades.map((t: any) => ({
                id: t.id,
                participantId: t.participant_id,
                nickname: t.participants?.nickname || 'Unknown',
                symbol: t.symbol,
                type: t.type,
                lotSize: t.lot_size,
                profit: t.profit,
                closeTime: t.close_time
            })),
            competition: {
                totalDays,
                startDate: firstDate,
                mostActiveTrader: mostActive
                    ? {
                          nickname: (mostActive.participants as any)?.nickname || 'Unknown',
                          totalTrades: mostActive.total_trades || 0
                      }
                    : null
            },
            topFive,
            allParticipants,
            participants,
            sentimentBySymbol,
            sentimentStatus
        };

        setCache(CACHE_KEY, result, CACHE_TTL);
        return { ...result, telegramBotUsername: env.TELEGRAM_BOT_USERNAME || '' };
    } catch (e) {
        console.error('Dashboard data fetch failed:', e);
        return {
            summary: { totalParticipants: 0, totalTrades: 0, totalVolume: 0, averageWinRate: 0 },
            topPerformer: null,
            recentTrades: [],
            competition: { totalDays: 0, startDate: '', mostActiveTrader: null },
            topFive: [],
            allParticipants: [],
            participants: [],
            sentimentBySymbol: [],
            sentimentStatus: 'unavailable' as const,
            telegramBotUsername: env.TELEGRAM_BOT_USERNAME || ''
        };
    }
};
