import { supabase } from '$lib/supabase';
import { json } from '@sveltejs/kit';

export async function GET() {
	const { data, error } = await supabase
		.from('live_status')
		.select('coach_youtube, video_id, updated_at')
		.eq('id', 1)
		.single();

	if (error) return json({ coach_youtube: null, video_id: null });
	return json(data);
}

export async function PUT({ request }) {
	const body = await request.json();
	const { coach_youtube, video_id } = body;

	const { data, error } = await supabase
		.from('live_status')
		.upsert({
			id: 1,
			coach_youtube: coach_youtube || null,
			video_id: video_id || null,
			updated_at: new Date().toISOString()
		})
		.select()
		.single();

	if (error) return json({ error: error.message }, { status: 500 });
	return json(data);
}
