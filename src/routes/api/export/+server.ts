import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const participantId = url.searchParams.get('participant_id');
    const format = url.searchParams.get('format') || 'csv';

    if (!participantId) {
        return json({ error: 'participant_id is required' }, { status: 400 });
    }

    const [participantResult, tradesResult, statsResult] = await Promise.all([
        supabase.from('participants').select('nickname').eq('id', participantId).single(),
        supabase
            .from('trades')
            .select('symbol, type, lot_size, open_price, close_price, sl, tp, open_time, close_time, profit')
            .eq('participant_id', participantId)
            .order('close_time', { ascending: false }),
        supabase
            .from('daily_stats')
            .select('date, balance, equity, profit, points, win_rate, total_trades, profit_factor, max_drawdown')
            .eq('participant_id', participantId)
            .order('date', { ascending: false })
    ]);

    const nickname = participantResult.data?.nickname || 'trader';
    const trades = tradesResult.data || [];
    const stats = statsResult.data || [];

    if (format === 'stats') {
        // Export daily stats as CSV
        const headers = ['Date', 'Balance', 'Equity', 'Profit', 'Points', 'Win Rate', 'Total Trades', 'Profit Factor', 'Max DD'];
        const rows = stats.map(s => [
            s.date,
            s.balance,
            s.equity,
            s.profit,
            s.points,
            s.win_rate,
            s.total_trades,
            s.profit_factor,
            s.max_drawdown
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${nickname}_stats.csv"`
            }
        });
    }

    // Default: export trades as CSV
    const headers = ['Symbol', 'Type', 'Lot', 'Open Price', 'Close Price', 'SL', 'TP', 'Open Time', 'Close Time', 'Profit'];
    const rows = trades.map(t => [
        t.symbol,
        t.type,
        t.lot_size,
        t.open_price,
        t.close_price,
        t.sl || '',
        t.tp || '',
        t.open_time,
        t.close_time,
        t.profit
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${nickname}_trades.csv"`
        }
    });
};
