import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function GET({ url }) {
    const symbol = url.searchParams.get('symbol');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const timeframe = url.searchParams.get('timeframe') || 'M5'; // Default to M5 for best chart detail

    if (!symbol || !from || !to) {
        return json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Normalize symbol for market data query
    // The bridge saves all Gold variants as "XAUUSD"
    let querySymbol = symbol;
    if (symbol.includes('XAU') || symbol.includes('GOLD')) {
        querySymbol = 'XAUUSD';
    }

    const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', querySymbol)
        .eq('timeframe', timeframe)
        .gte('time', from)
        .lte('time', to)
        .order('time', { ascending: true });

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    // If no data found for requested timeframe, try fallback to M15
    if (!data || data.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('market_data')
            .select('*')
            .eq('symbol', querySymbol)
            .eq('timeframe', 'M15')
            .gte('time', from)
            .lte('time', to)
            .order('time', { ascending: true });

        if (fallbackError) {
            return json({ error: fallbackError.message }, { status: 500 });
        }

        return json(fallbackData || []);
    }

    return json(data);
}
