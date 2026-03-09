import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function POST({ request }) {
    const body = await request.json();
    const { nickname, account_id, server, investor_password } = body;

    if (!nickname || !account_id) {
        return json({ error: 'Nickname and Account ID are required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('participants')
            .insert({
                nickname,
                account_id,
                server: server || null,
                investor_password: investor_password || null
            })
            .select()
            .single();

        if (error) throw error;

        return json({ success: true, participant: data });
    } catch (e: any) {
        return json({ error: e.message || 'Failed to add participant' }, { status: 500 });
    }
}

export async function PUT({ request }) {
    const body = await request.json();
    const { id, nickname, account_id, server, investor_password } = body;

    if (!id) {
        return json({ error: 'Participant ID is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (nickname) updateData.nickname = nickname;
    if (account_id) updateData.account_id = account_id;
    if (server !== undefined) updateData.server = server || null;
    if (investor_password) updateData.investor_password = investor_password;

    try {
        const { data, error } = await supabase
            .from('participants')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return json({ success: true, participant: data });
    } catch (e: any) {
        return json({ error: e.message || 'Failed to update participant' }, { status: 500 });
    }
}
