import { supabase } from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
    const { id } = params;

    // 1. Fetch Trade Details
    const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .single();

    if (tradeError || !trade) {
        console.error('Error fetching trade:', tradeError);
        throw error(404, 'Trade not found');
    }

    // 2. Fetch Initial Candles (Default M15)
    // Strip suffix if present (e.g. 'XAUUSD.s' -> 'XAUUSD')
    const symbol = trade.symbol.replace('.s', '');

    const { data: candles, error: candlesError } = await supabase
        .from('market_data') // Using 'market_data' table as verified
        .select('*')
        .eq('symbol', symbol)
        .order('time', { ascending: false })
        .limit(1000);

    if (candles) {
        candles.reverse(); // Ensure chronological order for the chart
    }

    if (candlesError) {
        console.error('Error fetching candles:', candlesError);
        // We don't throw here, just return empty candles so the page still loads
    }

    return {
        trade,
        initialCandles: candles || []
    };
}
