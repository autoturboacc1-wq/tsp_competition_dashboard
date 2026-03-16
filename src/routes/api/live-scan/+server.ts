import { json } from '@sveltejs/kit';
import { coaches } from '$lib/coaches';
import { YOUTUBE_API_KEY } from '$env/static/private';

let lastScanTime = 0;
let cachedResult: any = null;
const SCAN_COOLDOWN = 90_000; // 90 seconds

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

	// Use YouTube Data API v3 to check all coaches for live streams
	// Each search.list call costs 100 quota units (daily limit: 10,000)
	// Scan all coaches in parallel
	const results = await Promise.all(
		coaches.map(async (coach) => {
			try {
				const params = new URLSearchParams({
					part: 'snippet',
					channelId: coach.youtubeChannelId,
					eventType: 'live',
					type: 'video',
					maxResults: '1',
					key: YOUTUBE_API_KEY
				});

				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?${params}`
				);
				const data = await res.json();

				if (data.items?.length > 0) {
					return {
						youtube: coach.youtube,
						name: coach.name,
						isLive: true,
						videoId: data.items[0].id.videoId
					};
				}

				return { youtube: coach.youtube, name: coach.name, isLive: false, videoId: null };
			} catch {
				return { youtube: coach.youtube, name: coach.name, isLive: false, videoId: null };
			}
		})
	);

	const liveCoaches = results.filter((r) => r.isLive);

	cachedResult = { liveCoaches, scannedAt: new Date().toISOString() };
	lastScanTime = now;

	return json({ ...cachedResult, cached: false });
}
