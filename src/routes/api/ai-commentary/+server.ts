import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { supabase } from '$lib/supabase';
import type { RequestHandler } from './$types';

function getOpenAIClient() {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

const COMMENTARY_PROMPT = `คุณเป็นคอมเมนเตเตอร์การแข่งขันเทรด Forex
ให้คอมเมนต์สั้นๆ 1-2 ประโยค เกี่ยวกับเทรดที่ปิดไป

กฎ:
- ใช้ภาษาไทย สไตล์พากย์กีฬา สนุก กระชับ
- ถ้ากำไรเยอะ ให้ชื่นชม โดยเฉพาะถ้า rank ต้น
- ถ้าขาดทุนเยอะ ให้ให้กำลังใจ และกระตุ้นให้สู้ต่อ
- ถ้าธรรมดา ให้คอมเมนต์เรื่อง strategy
- ถ้า rank ต้น (1-3) ให้คอมเมนต์เชิงผู้นำ เช่น รักษาตำแหน่ง
- ถ้า rank ต่ำ ให้กระตุ้นให้ไต่อันดับ
- อ้างถึง win rate ถ้าเกี่ยวข้อง (เช่น WR สูงแต่ขาดทุน หรือ WR ต่ำแต่กำไร)
- ใช้ emoji 1-2 ตัว
- ห้ามเกิน 100 คำ
- ตอบเป็นข้อความเดียว ไม่ต้องมี heading`;

async function fetchTraderContextMap(participantIds: string[]): Promise<Map<string, { rank: number; winRate: number; totalParticipants: number }>> {
    const map = new Map<string, { rank: number; winRate: number; totalParticipants: number }>();
    if (participantIds.length === 0) return map;

    try {
        const { data, error } = await supabase
            .from('daily_stats')
            .select('participant_id, points, profit, win_rate')
            .order('date', { ascending: false });

        if (error || !data) return map;

        // Deduplicate to latest per participant
        const seen = new Set<string>();
        const latest: any[] = [];
        for (const row of data) {
            if (!seen.has(row.participant_id)) {
                seen.add(row.participant_id);
                latest.push(row);
            }
        }

        // Sort by points for ranking
        latest.sort((a, b) => Number(b.points) - Number(a.points) || Number(b.profit) - Number(a.profit));
        const total = latest.length;

        for (const pid of participantIds) {
            const idx = latest.findIndex(r => r.participant_id === pid);
            if (idx >= 0) {
                map.set(pid, {
                    rank: idx + 1,
                    winRate: Number(latest[idx].win_rate) || 0,
                    totalParticipants: total
                });
            }
        }
    } catch {
        // fail silently — context is optional enhancement
    }

    return map;
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { trades } = await request.json();

        if (!trades || !Array.isArray(trades) || trades.length === 0) {
            return json({ error: { message: 'ไม่มีข้อมูลเทรด' } }, { status: 400 });
        }

        if (!env.OPENAI_API_KEY) {
            return json({ error: { message: 'AI ยังไม่ได้ตั้งค่า' } }, { status: 500 });
        }

        const tradesToComment = trades.slice(0, 5);

        // Fetch rank + win rate context from DB
        const uniqueParticipantIds = [...new Set(
            tradesToComment.map((t: any) => t.participantId).filter(Boolean)
        )] as string[];
        const contextMap = await fetchTraderContextMap(uniqueParticipantIds);

        const openai = getOpenAIClient();

        const tradeDescriptions = tradesToComment.map((t: any, i: number) => {
            const ctx = contextMap.get(t.participantId);
            const contextStr = ctx
                ? ` [Rank #${ctx.rank}/${ctx.totalParticipants}, WR ${ctx.winRate.toFixed(1)}%]`
                : '';
            return `${i + 1}. ${t.nickname}${contextStr}: ${t.type} ${t.symbol} (${t.lot} lot) P/L: $${Number(t.profit).toFixed(2)}`;
        }).join('\n');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: COMMENTARY_PROMPT },
                { role: 'user', content: `เทรดที่เพิ่งปิด:\n${tradeDescriptions}\n\nให้คอมเมนต์แยกแต่ละเทรด โดยใส่ตัวเลขกำกับ` }
            ],
            temperature: 0.8,
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content || '';

        // Parse numbered comments back to individual trades
        const comments: Record<number, string> = {};
        const lines = content.split('\n').filter(l => l.trim());

        let currentIdx = -1;
        for (const line of lines) {
            const match = line.match(/^(\d+)\.\s*(.*)/);
            if (match) {
                currentIdx = parseInt(match[1]) - 1;
                comments[currentIdx] = match[2].trim();
            } else if (currentIdx >= 0) {
                comments[currentIdx] = (comments[currentIdx] || '') + ' ' + line.trim();
            }
        }

        const results = tradesToComment.map((trade: any, i: number) => ({
            tradeId: trade.id,
            commentary: comments[i] || ''
        }));

        return json({ commentaries: results });
    } catch (error) {
        console.error('AI Commentary error:', error);
        return json({ error: { message: 'เกิดข้อผิดพลาด' } }, { status: 500 });
    }
};
