import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function GET({ url }) {
    const symbol = url.searchParams.get('symbol');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!symbol || !from || !to) {
        return json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .gte('time', from)
        .lte('time', to)
        .order('time', { ascending: true });

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json(data);
}
