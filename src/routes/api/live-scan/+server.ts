import { supabase } from '$lib/supabase';
import { json } from '@sveltejs/kit';
import { coaches } from '$lib/coaches';

let lastScanTime = 0;
let cachedResult: any = null;
const SCAN_COOLDOWN = 90_000; // 90 seconds

async function checkYoutubeLive(
	handle: string
): Promise<{ isLive: boolean; videoId: string | null }> {
	try {
		const res = await fetch(`https://www.youtube.com/${handle}/live`, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept-Language': 'en-US,en;q=0.9',
				Cookie: 'CONSENT=PENDING+987'
			},
			redirect: 'follow'
		});

		const html = await res.text();
		const isLive = html.includes('"isLive":true');

		if (isLive) {
			const canonicalMatch = html.match(
				/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})">/
			);
			const videoIdMatch = html.match(/"videoId":"([\w-]{11})"/);
			const videoId = canonicalMatch?.[1] || videoIdMatch?.[1] || null;
			return { isLive: true, videoId };
		}

		return { isLive: false, videoId: null };
	} catch {
		return { isLive: false, videoId: null };
	}
}

export async function GET({ url }) {
	// Test mode: return mock live data
	if (url.searchParams.has('test')) {
		const testCoaches = [
			{ youtube: coaches[6].youtube, name: coaches[6].name, isLive: true, videoId: 'jfKfPfyJRdk' },
			{ youtube: coaches[3].youtube, name: coaches[3].name, isLive: true, videoId: 'jfKfPfyJRdk' }
		];
		return json({ liveCoaches: testCoaches, scannedAt: new Date().toISOString(), cached: false });
	}

	const now = Date.now();

	// Return cached result if within cooldown
	if (cachedResult && now - lastScanTime < SCAN_COOLDOWN) {
		return json({ ...cachedResult, cached: true });
	}

	// Scan all coaches in parallel
	const results = await Promise.all(
		coaches.map(async (coach) => {
			const { isLive, videoId } = await checkYoutubeLive(coach.youtube);
			return { youtube: coach.youtube, name: coach.name, isLive, videoId };
		})
	);

	// Return ALL live coaches
	const liveCoaches = results.filter((r) => r.isLive);

	cachedResult = { liveCoaches, scannedAt: new Date().toISOString() };
	lastScanTime = now;

	return json({ ...cachedResult, cached: false });
}
