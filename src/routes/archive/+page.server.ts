import { supabase } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const { data: competitions, error } = await supabase
        .from('competitions')
        .select('*')
        .order('start_date', { ascending: false });

    if (error) {
        console.error('Failed to load competitions:', error);
        return { competitions: [] };
    }

    return { competitions: competitions || [] };
};
