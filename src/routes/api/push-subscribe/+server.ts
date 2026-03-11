import { json, type RequestEvent } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export const POST = async ({ request }: RequestEvent) => {
    const { subscription, participant_id } = await request.json();

    if (!subscription?.endpoint) {
        return json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
        {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            participant_id: participant_id || null
        },
        { onConflict: 'endpoint' }
    );

    if (error) {
        console.error('Failed to save push subscription:', error);
        return json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return json({ success: true });
};

export const DELETE = async ({ request }: RequestEvent) => {
    const { endpoint } = await request.json();

    if (!endpoint) {
        return json({ error: 'Endpoint is required' }, { status: 400 });
    }

    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

    if (error) {
        console.error('Failed to delete push subscription:', error);
        return json({ error: 'Failed to delete subscription' }, { status: 500 });
    }

    return json({ success: true });
};
