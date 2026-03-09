import { supabase } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        // Fetch all daily stats with participant info, grouped by date
        const { data: allStats, error } = await supabase
            .from('daily_stats')
            .select('participant_id, date, balance, equity, profit, points, win_rate, total_trades, participants(nickname)')
            .order('date', { ascending: false })
            .order('points', { ascending: false });

        if (error) throw error;

        if (!allStats || allStats.length === 0) {
            return { days: [], availableDates: [] };
        }

        // Group by date
        const dateMap = new Map<string, any[]>();
        allStats.forEach(entry => {
            const date = entry.date;
            if (!dateMap.has(date)) {
                dateMap.set(date, []);
            }
            dateMap.get(date)!.push({
                participantId: entry.participant_id,
                nickname: (entry.participants as any)?.nickname || 'Unknown',
                points: entry.points,
                profit: entry.profit,
                balance: entry.balance,
                equity: entry.equity,
                winRate: entry.win_rate,
                totalTrades: entry.total_trades
            });
        });

        // Sort entries within each date by points desc
        const days = Array.from(dateMap.entries()).map(([date, entries]) => ({
            date,
            entries: entries.sort((a, b) => b.points - a.points || b.profit - a.profit),
            topTrader: entries.sort((a, b) => b.points - a.points)[0]
        }));

        const availableDates = days.map(d => d.date);

        return { days, availableDates };
    } catch (e) {
        console.error('History data fetch failed:', e);
        return { days: [], availableDates: [] };
    }
};
