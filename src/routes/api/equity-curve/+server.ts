import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

/**
 * GET /api/equity-curve?participant_id=xxx&days=30
 * 
 * Returns equity curve data for charting (MyFxBook-style)
 */
export async function GET({ url }) {
    const participantId = url.searchParams.get('participant_id');
    const days = parseInt(url.searchParams.get('days') || '30');

    if (!participantId) {
        return json({ error: 'Missing participant_id parameter' }, { status: 400 });
    }

    // Calculate date range (days=0 means all data)
    const since = days > 0 ? new Date() : null;
    if (since) since.setDate(since.getDate() - days);

    try {
        // Fetch equity snapshots
        let query = supabase
            .from('equity_snapshots')
            .select('timestamp, balance, equity, floating_pl')
            .eq('participant_id', participantId)
            .order('timestamp', { ascending: true });

        if (since) {
            query = query.gte('timestamp', since.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching equity curve:', error);
            return json({ error: error.message }, { status: 500 });
        }

        // Transform data for frontend charting
        const chartData = (data || []).map(point => ({
            time: new Date(point.timestamp).getTime() / 1000, // Unix timestamp for chart
            equity: parseFloat(point.equity),
            balance: parseFloat(point.balance),
            floatingPL: parseFloat(point.floating_pl || 0)
        }));

        return json({
            success: true,
            data: chartData,
            count: chartData.length,
            range: {
                from: since?.toISOString() || 'all',
                to: new Date().toISOString()
            }
        });

    } catch (e) {
        console.error('Error in equity-curve API:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}
