import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { supabase } from '$lib/supabase';
import { getTodayDateThai } from '$lib/timezone';
import type { RequestHandler } from './$types';

// ─── In-memory cache (TTL: 30 minutes) ──────────────────────────────
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached(key: string): any | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key: string, data: any): void {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getOpenAIClient() {
    if (!env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
    }
    return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

// ─── Request Handler ─────────────────────────────────────────────────

export const GET: RequestHandler = async () => {
    try {
        const todayThai = getTodayDateThai();
        const cacheKey = `daily-highlight-${todayThai}`;

        // Check cache first
        const cached = getCached(cacheKey);
        if (cached) {
            return json(cached);
        }

        // 1. Fetch today's daily_stats (or fallback to latest date)
        let { data: todayStats, error: statsError } = await supabase
            .from('daily_stats')
            .select('*, participants(nickname)')
            .eq('date', todayThai)
            .order('points', { ascending: false });

        let usedDate = todayThai;

        if (statsError || !todayStats || todayStats.length === 0) {
            // Fallback: get the latest date available
            const { data: latestRow } = await supabase
                .from('daily_stats')
                .select('date')
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestRow?.date) {
                usedDate = latestRow.date;
                const { data: fallbackStats } = await supabase
                    .from('daily_stats')
                    .select('*, participants(nickname)')
                    .eq('date', usedDate)
                    .order('points', { ascending: false });

                todayStats = fallbackStats || [];
            } else {
                todayStats = [];
            }
        }

        // Determine top trader
        const topTrader = todayStats.length > 0
            ? {
                nickname: todayStats[0].participants?.nickname || 'Unknown',
                profit: Number(todayStats[0].profit) || 0,
                points: Number(todayStats[0].points) || 0
            }
            : null;

        // 2. Fetch recent notable trades (last 24h, sorted by absolute profit)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentTrades } = await supabase
            .from('trades')
            .select('symbol, type, lot_size, profit, close_time, participant_id, participants(nickname)')
            .gte('close_time', twentyFourHoursAgo)
            .order('close_time', { ascending: false })
            .limit(50);

        // Sort by absolute profit and take top 5
        const notableTrades = (recentTrades || [])
            .sort((a: any, b: any) => Math.abs(Number(b.profit)) - Math.abs(Number(a.profit)))
            .slice(0, 5)
            .map((t: any) => ({
                nickname: t.participants?.nickname || 'Unknown',
                symbol: t.symbol,
                type: t.type,
                lotSize: t.lot_size,
                profit: Number(t.profit),
                closeTime: t.close_time
            }));

        // 3. Build context for AI
        const statsContext = todayStats.slice(0, 10).map((s: any, i: number) => {
            const nickname = s.participants?.nickname || `Trader ${i + 1}`;
            return `${i + 1}. ${nickname}: Profit $${Number(s.profit).toFixed(2)}, Points ${s.points}, Win Rate ${Number(s.win_rate).toFixed(1)}%, Trades ${s.total_trades}`;
        }).join('\n');

        const tradesContext = notableTrades.map((t: any, i: number) =>
            `${i + 1}. ${t.nickname}: ${t.symbol} ${t.type} ${t.lotSize}lot, P/L $${t.profit.toFixed(2)}`
        ).join('\n');

        const prompt = `You are a competition commentator for a Forex trading competition called "EliteGold TSP Competition".

Here is today's leaderboard data (date: ${usedDate}):
${statsContext || 'No stats available yet.'}

Notable recent trades (last 24h):
${tradesContext || 'No notable trades yet.'}

Write a short, engaging competition highlight in Thai language (max 200 words). Cover:
- Who is leading and by how much
- Any exciting trades or movements
- Brief competitive narrative / drama
- Keep the tone fun and energetic but professional

Use markdown formatting (bold, bullet points) sparingly. Do NOT use headers.`;

        // 4. Call OpenAI
        let highlight = '';
        try {
            const openai = getOpenAIClient();
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a Thai-language Forex competition commentator. Write concise, engaging highlights.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            highlight = completion.choices[0]?.message?.content || '';
        } catch (aiErr) {
            console.error('Daily highlight AI error:', aiErr);
            highlight = 'ไม่สามารถสร้างไฮไลท์ได้ในขณะนี้';
        }

        // 5. Build response
        const result = {
            success: true,
            highlight,
            date: usedDate,
            topTrader,
            notableTrades
        };

        // Cache the result
        setCache(cacheKey, result);

        return json(result);
    } catch (error) {
        console.error('Daily highlight error:', error);
        return json(
            { success: false, error: 'Failed to generate daily highlight' },
            { status: 500 }
        );
    }
};
