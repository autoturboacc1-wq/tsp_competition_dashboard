import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function GET({ url }) {
    const symbol = url.searchParams.get('symbol');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

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
        .gte('time', from)
        .lte('time', to)
        .order('time', { ascending: true });

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json(data);
}
