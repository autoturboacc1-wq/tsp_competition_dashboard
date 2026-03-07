import type { Handle } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipRequestMap) {
        if (now > data.resetTime) ipRequestMap.delete(ip);
    }
}, 5 * 60_000);

export const handle: Handle = async ({ event, resolve }) => {
    if (event.url.pathname === '/api/ai-analysis' && event.request.method === 'POST') {
        const ip = event.getClientAddress();
        const now = Date.now();
        const entry = ipRequestMap.get(ip);

        if (entry && now < entry.resetTime) {
            if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
                return json(
                    {
                        error: {
                            code: 'rate_limited',
                            message: 'คำขอมากเกินไป กรุณารอสักครู่',
                            retryable: true
                        }
                    },
                    { status: 429 }
                );
            }
            entry.count++;
        } else {
            ipRequestMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        }
    }

    return resolve(event);
};
