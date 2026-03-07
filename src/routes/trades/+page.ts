import { supabase } from '$lib/supabaseClient';
import { createAsyncMeta, formatSupabaseLoadError } from '$lib/async-state';

export async function load() {
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .order('open_time', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching trades:', error);
        return {
            ...createAsyncMeta({
                loadError: formatSupabaseLoadError('รายการเทรด', error),
                lastUpdated: null
            }),
            trades: []
        };
    }

    return {
        ...createAsyncMeta(),
        trades
    };
}
