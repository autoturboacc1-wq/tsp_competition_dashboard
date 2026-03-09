import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

/**
 * GET /api/trades?participant_id=xxx&page=1&limit=20
 * Paginated trade history for lazy loading
 */
export async function GET({ url }) {
    const participantId = url.searchParams.get('participant_id');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!participantId) {
        return json({ error: 'Missing participant_id' }, { status: 400 });
    }

    try {
        const { data, error, count } = await supabase
            .from('trades')
            .select('*', { count: 'exact' })
            .eq('participant_id', participantId)
            .order('close_time', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return json({
            success: true,
            trades: (data || []).map((t: any) => ({
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
            })),
            pagination: {
                page,
                limit,
                total: count || 0,
                hasMore: (count || 0) > offset + limit
            }
        });
    } catch (e: any) {
        return json({ error: e.message || 'Failed to fetch trades' }, { status: 500 });
    }
}
