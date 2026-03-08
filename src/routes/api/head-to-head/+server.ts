import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { supabase } from '$lib/supabase';
import type { RequestHandler } from './$types';

function getOpenAIClient() {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

const H2H_SYSTEM_PROMPT = `คุณเป็นนักวิเคราะห์การแข่งขันเทรด Forex มืออาชีพระดับสูงสำหรับหน้า Head-to-Head

เขียนภาษาไทยแบบคม ชัด กระชับ และอ่านง่าย โดยให้ผลลัพธ์เป็น "commentary รอง" ต่อจากตาราง compare

รูปแบบที่ต้องการ:
1. **Verdict** สั้น 1 ย่อหน้า ว่าใครได้เปรียบและจากอะไร (อ้างอิงตัวเลขจริง)
2. **จุดแข็ง Trader A** - bullet list วิเคราะห์จากข้อมูลทั้งหมด (stats, progression, trades, equity)
3. **จุดแข็ง Trader B** - bullet list วิเคราะห์จากข้อมูลทั้งหมด
4. **Deep Comparison** - วิเคราะห์เปรียบเทียบเชิงลึก:
   - ใครมีพัฒนาการดีกว่า (ดูจาก Historical Progression)
   - ใครจัดการความเสี่ยงดีกว่า (Drawdown, Equity Curve)
   - ใครมี consistency สูงกว่า (Win Rate trend, Consecutive stats)
   - Session/Style comparison
5. **Closing insight** - คำแนะนำสำหรับแต่ละคนและทำนายแนวโน้มอนาคต

ข้อกำหนด:
- เน้นอธิบายจากตัวเลขที่ให้มาเท่านั้น
- ถ้าข้อมูลบางด้านไม่มี ห้ามเดา
- ใช้ markdown สั้นๆ อ่านสแกนง่าย`;

// ─── Database Fetching ───────────────────────────────────────────────

interface TraderH2HData {
    nickname: string;
    latestStats: any | null;
    dailyHistory: any[];
    recentTrades: any[];
    equitySnapshots: any[];
}

async function fetchTraderH2HData(traderId: string): Promise<TraderH2HData | null> {
    const [participantRes, statsRes, historyRes, tradesRes, equityRes] = await Promise.allSettled([
        supabase.from('participants').select('nickname').eq('id', traderId).single(),
        supabase.from('daily_stats').select('*').eq('participant_id', traderId).order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('daily_stats').select('date, balance, profit, win_rate, max_drawdown, profit_factor, total_trades').eq('participant_id', traderId).order('date', { ascending: true }),
        supabase.from('trades').select('symbol, type, lot_size, profit, open_time, close_time').eq('participant_id', traderId).order('close_time', { ascending: false }).limit(50),
        supabase.from('equity_snapshots').select('timestamp, equity, floating_pl').eq('participant_id', traderId).order('timestamp', { ascending: true })
    ]);

    const extract = (res: PromiseSettledResult<{ data: any; error: any }>, fallback: any): any => {
        if (res.status === 'rejected') return fallback;
        if (res.value.error) return fallback;
        return res.value.data ?? fallback;
    };

    const participant = extract(participantRes, null);
    if (!participant) return null;

    return {
        nickname: participant.nickname,
        latestStats: extract(statsRes, null),
        dailyHistory: extract(historyRes, []),
        recentTrades: extract(tradesRes, []),
        equitySnapshots: extract(equityRes, [])
    };
}

// ─── Context Formatting ──────────────────────────────────────────────

function formatH2HTrader(data: TraderH2HData, label: string): string {
    const s = data.latestStats;
    let context = `## ${label}: ${data.nickname}\n`;

    if (s) {
        context += `### Current Stats\n`;
        context += `- Points: ${s.points || 0} | Profit: $${Number(s.profit).toFixed(2)} | Balance: $${Number(s.balance).toFixed(2)}\n`;
        context += `- Win Rate: ${Number(s.win_rate).toFixed(1)}% | RR Ratio: ${Number(s.rr_ratio).toFixed(2)} | Profit Factor: ${Number(s.profit_factor).toFixed(2)}\n`;
        context += `- Max Drawdown: ${Number(s.max_drawdown).toFixed(1)}% | Total Trades: ${s.total_trades}\n`;
        context += `- Avg Win: $${Number(s.avg_win).toFixed(2)} | Avg Loss: $${Number(s.avg_loss).toFixed(2)}\n`;
        context += `- Best: $${Number(s.best_trade).toFixed(2)} | Worst: $${Number(s.worst_trade).toFixed(2)}\n`;
        context += `- Long WR: ${Number(s.win_rate_buy).toFixed(1)}% | Short WR: ${Number(s.win_rate_sell).toFixed(1)}%\n`;
        context += `- Consecutive Wins: ${s.max_consecutive_wins || 0} | Losses: ${s.max_consecutive_losses || 0}\n`;
        context += `- Style: ${s.trading_style || 'Unknown'} | Pair: ${s.favorite_pair || '-'} | Hold: ${s.avg_holding_time || '-'}\n`;
        context += `- Asian: WR ${Number(s.session_asian_win_rate).toFixed(1)}%, P/L $${Number(s.session_asian_profit).toFixed(2)}\n`;
        context += `- London: WR ${Number(s.session_london_win_rate).toFixed(1)}%, P/L $${Number(s.session_london_profit).toFixed(2)}\n`;
        context += `- NY: WR ${Number(s.session_newyork_win_rate).toFixed(1)}%, P/L $${Number(s.session_newyork_profit).toFixed(2)}\n`;
    }

    // Progression summary
    if (data.dailyHistory.length >= 2) {
        const first = data.dailyHistory[0];
        const last = data.dailyHistory[data.dailyHistory.length - 1];
        context += `\n### Progression (${data.dailyHistory.length} days)\n`;
        context += `- Start: Balance $${Number(first.balance).toFixed(2)}, WR ${Number(first.win_rate).toFixed(1)}%, DD ${Number(first.max_drawdown).toFixed(1)}%\n`;
        context += `- Latest: Balance $${Number(last.balance).toFixed(2)}, WR ${Number(last.win_rate).toFixed(1)}%, DD ${Number(last.max_drawdown).toFixed(1)}%\n`;
        const profitChange = Number(last.profit) - Number(first.profit);
        const wrChange = Number(last.win_rate) - Number(first.win_rate);
        context += `- Changes: Profit ${profitChange >= 0 ? '+' : ''}$${profitChange.toFixed(2)}, WR ${wrChange >= 0 ? '+' : ''}${wrChange.toFixed(1)}%\n`;
    }

    // Equity summary
    if (data.equitySnapshots.length > 0) {
        const snaps = data.equitySnapshots;
        let peak = -Infinity, trough = Infinity;
        let runningPeak = Number(snaps[0].equity), maxDD = 0;
        for (const snap of snaps) {
            const eq = Number(snap.equity);
            if (eq > peak) peak = eq;
            if (eq < trough) trough = eq;
            if (eq > runningPeak) runningPeak = eq;
            const dd = ((runningPeak - eq) / runningPeak) * 100;
            if (dd > maxDD) maxDD = dd;
        }
        const growth = ((Number(snaps[snaps.length - 1].equity) - Number(snaps[0].equity)) / Number(snaps[0].equity)) * 100;
        context += `\n### Equity Curve\n`;
        context += `- Peak: $${peak.toFixed(2)} | Trough: $${trough.toFixed(2)} | Max DD: ${maxDD.toFixed(2)}%\n`;
        context += `- Growth: ${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%\n`;
    }

    // Recent trades summary
    if (data.recentTrades.length > 0) {
        const trades = data.recentTrades;
        const wins = trades.filter(t => Number(t.profit) > 0);
        const symbols = [...new Set(trades.map(t => t.symbol))];
        context += `\n### Recent Trades (${trades.length})\n`;
        context += `- Win: ${wins.length}/${trades.length} (${((wins.length / trades.length) * 100).toFixed(1)}%)\n`;
        context += `- Symbols: ${symbols.join(', ')}\n`;
        // Show last 10 trades
        const show = trades.slice(0, 10);
        show.forEach((t, i) => {
            context += `${i + 1}. ${t.symbol} ${t.type} ${t.lot_size}lot P/L $${Number(t.profit).toFixed(2)}\n`;
        });
    }

    return context;
}

// Legacy format from frontend-passed trader object
function formatTraderStatsLegacy(trader: any, label: string): string {
    const s = trader.stats || {};
    const optionalLines = [
        s.bestTrade != null || s.worstTrade != null
            ? `- Best: $${s.bestTrade || 0} | Worst: $${s.worstTrade || 0}`
            : null,
        s.winRateBuy != null || s.winRateSell != null
            ? `- Long WR: ${s.winRateBuy?.toFixed(1) || 0}% | Short WR: ${s.winRateSell?.toFixed(1) || 0}%`
            : null,
        s.maxConsecutiveWins != null || s.maxConsecutiveLosses != null
            ? `- Max Consecutive Wins: ${s.maxConsecutiveWins || 0} | Losses: ${s.maxConsecutiveLosses || 0}`
            : null,
        s.tradingStyle || s.favoritePair || s.avgHoldingTime
            ? `- Style: ${s.tradingStyle || 'Unknown'} | Pair: ${s.favoritePair || '-'} | Hold: ${s.avgHoldingTime || '-'}`
            : null,
        s.sessionAsianProfit != null || s.sessionAsianWinRate != null
            ? `- Asian: WR ${s.sessionAsianWinRate?.toFixed(1) || 0}%, P/L $${s.sessionAsianProfit?.toFixed(2) || 0}`
            : null,
        s.sessionLondonProfit != null || s.sessionLondonWinRate != null
            ? `- London: WR ${s.sessionLondonWinRate?.toFixed(1) || 0}%, P/L $${s.sessionLondonProfit?.toFixed(2) || 0}`
            : null,
        s.sessionNewYorkProfit != null || s.sessionNewYorkWinRate != null
            ? `- NY: WR ${s.sessionNewYorkWinRate?.toFixed(1) || 0}%, P/L $${s.sessionNewYorkProfit?.toFixed(2) || 0}`
            : null
    ].filter(Boolean).join('\n');

    return `## ${label}: ${trader.nickname}
- Points: ${trader.points || 0} | Profit: $${trader.profit?.toFixed(2) || 0}
- Win Rate: ${s.winRate?.toFixed(1) || 0}% | RR Ratio: ${s.rrRatio || 0}
- Profit Factor: ${s.profitFactor || 0} | Max DD: ${s.maxDrawdown || 0}%
- Total Trades: ${s.totalTrades || 0}
- Avg Win: $${s.avgWin || 0} | Avg Loss: $${s.avgLoss || 0}
${optionalLines ? `\n${optionalLines}` : ''}`;
}

// ─── Request Handler ─────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { traderAId, traderBId, traderA, traderB } = await request.json();

        // Support both new (IDs) and legacy (full objects) format
        const hasIds = traderAId && traderBId;
        const hasLegacy = traderA && traderB;

        if (!hasIds && !hasLegacy) {
            return json({ error: { code: 'bad_request', message: 'ต้องเลือกเทรดเดอร์ 2 คน' } }, { status: 400 });
        }

        if (!env.OPENAI_API_KEY) {
            return json({ error: { code: 'misconfigured', message: 'AI ยังไม่ได้ตั้งค่า' } }, { status: 500 });
        }

        let userContent: string;

        if (hasIds) {
            const [dataA, dataB] = await Promise.all([
                fetchTraderH2HData(traderAId),
                fetchTraderH2HData(traderBId)
            ]);

            if (!dataA || !dataB) {
                return json({ error: { code: 'bad_request', message: 'ไม่พบข้อมูลเทรดเดอร์' } }, { status: 404 });
            }

            userContent = `${formatH2HTrader(dataA, 'Trader A')}\n\n${formatH2HTrader(dataB, 'Trader B')}`;
        } else {
            userContent = `${formatTraderStatsLegacy(traderA, 'Trader A')}\n\n${formatTraderStatsLegacy(traderB, 'Trader B')}`;
        }

        const openai = getOpenAIClient();
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const response = await openai.chat.completions.create({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: H2H_SYSTEM_PROMPT },
                            { role: 'user', content: userContent }
                        ],
                        temperature: 0.5,
                        stream: true,
                    });

                    for await (const chunk of response) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Stream error';
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });
    } catch (error) {
        console.error('Head-to-Head error:', error);
        return json({ error: { code: 'unknown', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' } }, { status: 500 });
    }
};
