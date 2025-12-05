import { supabase } from '$lib/supabaseClient';

export async function load() {
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .order('open_time', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching trades:', error);
        return { trades: [] };
    }

    return { trades };
}
