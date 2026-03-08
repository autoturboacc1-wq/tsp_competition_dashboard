import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { supabase } from '$lib/supabase';
import type { RequestHandler } from './$types';

function aiError(
    code: 'bad_request' | 'misconfigured' | 'provider_unavailable' | 'rate_limited' | 'unknown',
    message: string,
    retryable: boolean,
    status: number
) {
    return json(
        {
            error: {
                code,
                message,
                retryable
            }
        },
        { status }
    );
}

// Lazy initialization of AI clients
function getGeminiClient() {
    if (!env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

function getOpenAIClient() {
    if (!env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
    }
    return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

// ─── Database Fetching ───────────────────────────────────────────────

interface FetchedTraderData {
    participant: { id: string; nickname: string } | null;
    latestStats: any | null;
    dailyHistory: any[];
    trades: any[];
    equitySnapshots: any[];
    competitionStats: any[];
}

async function fetchTraderData(traderId: string): Promise<FetchedTraderData> {
    const [
        participantResult,
        latestStatsResult,
        dailyHistoryResult,
        tradesResult,
        snapshotResult,
        competitionResult
    ] = await Promise.allSettled([
        supabase
            .from('participants')
            .select('id, nickname')
            .eq('id', traderId)
            .single(),
        supabase
            .from('daily_stats')
            .select('*')
            .eq('participant_id', traderId)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from('daily_stats')
            .select('date, balance, equity, profit, points, win_rate, max_drawdown, profit_factor, rr_ratio, total_trades, avg_win, avg_loss, best_trade, worst_trade, trading_style, favorite_pair')
            .eq('participant_id', traderId)
            .order('date', { ascending: true }),
        supabase
            .from('trades')
            .select('symbol, type, lot_size, open_price, close_price, open_time, close_time, profit, sl, tp')
            .eq('participant_id', traderId)
            .order('close_time', { ascending: false })
            .limit(100),
        supabase
            .from('equity_snapshots')
            .select('timestamp, balance, equity, floating_pl')
            .eq('participant_id', traderId)
            .order('timestamp', { ascending: true }),
        supabase
            .from('daily_stats')
            .select('participant_id, points, profit, win_rate, profit_factor, max_drawdown, total_trades, participants(nickname)')
            .order('date', { ascending: false })
    ]);

    const extract = (result: PromiseSettledResult<{ data: any; error: any }>, fallback: any): any => {
        if (result.status === 'rejected') return fallback;
        if (result.value.error) return fallback;
        return result.value.data ?? fallback;
    };

    return {
        participant: extract(participantResult, null),
        latestStats: extract(latestStatsResult, null),
        dailyHistory: extract(dailyHistoryResult, []),
        trades: extract(tradesResult, []),
        equitySnapshots: extract(snapshotResult, []),
        competitionStats: extract(competitionResult, [])
    };
}

// ─── Data Summarization ──────────────────────────────────────────────

function summarizeDailyProgression(dailyHistory: any[]): string {
    if (!dailyHistory || dailyHistory.length === 0) return 'No historical data available.';

    const first = dailyHistory[0];
    const last = dailyHistory[dailyHistory.length - 1];
    const totalDays = dailyHistory.length;

    let summary = `### Historical Progression (${totalDays} days of data)\n`;
    summary += `**Start (${first.date}):** Balance $${Number(first.balance).toFixed(2)}, Profit $${Number(first.profit).toFixed(2)}, Win Rate ${Number(first.win_rate).toFixed(1)}%, Trades ${first.total_trades}\n`;
    summary += `**Latest (${last.date}):** Balance $${Number(last.balance).toFixed(2)}, Profit $${Number(last.profit).toFixed(2)}, Win Rate ${Number(last.win_rate).toFixed(1)}%, Trades ${last.total_trades}\n\n`;

    // Key metric changes
    const profitChange = Number(last.profit) - Number(first.profit);
    const winRateChange = Number(last.win_rate) - Number(first.win_rate);
    const ddChange = Number(last.max_drawdown) - Number(first.max_drawdown);

    summary += `**Changes:** Profit ${profitChange >= 0 ? '+' : ''}$${profitChange.toFixed(2)}, Win Rate ${winRateChange >= 0 ? '+' : ''}${winRateChange.toFixed(1)}%, Max DD ${ddChange >= 0 ? '+' : ''}${ddChange.toFixed(1)}%\n\n`;

    // Weekly snapshots (sample every 7 days or evenly if less)
    const step = Math.max(1, Math.floor(totalDays / 8));
    summary += '**Weekly Snapshots:**\n';
    for (let i = 0; i < totalDays; i += step) {
        const d = dailyHistory[i];
        summary += `- ${d.date}: P/L $${Number(d.profit).toFixed(2)}, WR ${Number(d.win_rate).toFixed(1)}%, PF ${Number(d.profit_factor).toFixed(2)}, DD ${Number(d.max_drawdown).toFixed(1)}%, Trades ${d.total_trades}\n`;
    }
    // Always include last if not already included
    if ((totalDays - 1) % step !== 0) {
        summary += `- ${last.date}: P/L $${Number(last.profit).toFixed(2)}, WR ${Number(last.win_rate).toFixed(1)}%, PF ${Number(last.profit_factor).toFixed(2)}, DD ${Number(last.max_drawdown).toFixed(1)}%, Trades ${last.total_trades}\n`;
    }

    // Detect notable trends
    const trends: string[] = [];
    if (totalDays >= 3) {
        const mid = dailyHistory[Math.floor(totalDays / 2)];
        const earlyWR = Number(first.win_rate);
        const midWR = Number(mid.win_rate);
        const lateWR = Number(last.win_rate);

        if (lateWR > earlyWR + 5) trends.push(`Win rate trending UP (+${(lateWR - earlyWR).toFixed(1)}%)`);
        else if (lateWR < earlyWR - 5) trends.push(`Win rate trending DOWN (${(lateWR - earlyWR).toFixed(1)}%)`);

        if (Number(last.max_drawdown) > Number(mid.max_drawdown) + 3) trends.push('Drawdown increasing recently');

        const profitTrend = Number(last.profit) - Number(mid.profit);
        const earlyProfit = Number(mid.profit) - Number(first.profit);
        if (profitTrend > 0 && earlyProfit > 0 && profitTrend > earlyProfit * 1.5) {
            trends.push('Profit acceleration in recent period');
        }
    }

    if (trends.length > 0) {
        summary += `\n**Notable Trends:** ${trends.join(', ')}\n`;
    }

    return summary;
}

function summarizeEquitySnapshots(snapshots: any[]): string {
    if (!snapshots || snapshots.length === 0) return 'No equity snapshot data available.';

    const total = snapshots.length;
    const firstSnap = snapshots[0];
    const lastSnap = snapshots[total - 1];

    // Find peak and trough
    let peakEquity = -Infinity, peakIdx = 0;
    let troughEquity = Infinity, troughIdx = 0;
    let maxDD = 0, maxDDPeakIdx = 0, maxDDTroughIdx = 0;
    let runningPeak = Number(snapshots[0].equity);
    let runningPeakIdx = 0;

    for (let i = 0; i < total; i++) {
        const eq = Number(snapshots[i].equity);
        if (eq > peakEquity) { peakEquity = eq; peakIdx = i; }
        if (eq < troughEquity) { troughEquity = eq; troughIdx = i; }
        if (eq > runningPeak) { runningPeak = eq; runningPeakIdx = i; }
        const dd = ((runningPeak - eq) / runningPeak) * 100;
        if (dd > maxDD) { maxDD = dd; maxDDPeakIdx = runningPeakIdx; maxDDTroughIdx = i; }
    }

    const formatTime = (ts: string) => new Date(ts).toISOString().slice(0, 16).replace('T', ' ');

    let summary = `### Equity Curve Analysis (${total} snapshots)\n`;
    summary += `- **Start:** $${Number(firstSnap.equity).toFixed(2)} (${formatTime(firstSnap.timestamp)})\n`;
    summary += `- **Latest:** $${Number(lastSnap.equity).toFixed(2)} (${formatTime(lastSnap.timestamp)})\n`;
    summary += `- **Peak Equity:** $${peakEquity.toFixed(2)} (${formatTime(snapshots[peakIdx].timestamp)})\n`;
    summary += `- **Lowest Equity:** $${troughEquity.toFixed(2)} (${formatTime(snapshots[troughIdx].timestamp)})\n`;
    summary += `- **Max Drawdown:** ${maxDD.toFixed(2)}% (from $${Number(snapshots[maxDDPeakIdx].equity).toFixed(2)} to $${Number(snapshots[maxDDTroughIdx].equity).toFixed(2)})\n`;

    // Equity growth
    const growth = ((Number(lastSnap.equity) - Number(firstSnap.equity)) / Number(firstSnap.equity)) * 100;
    summary += `- **Total Growth:** ${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%\n`;

    // Current floating P/L
    const currentFloating = Number(lastSnap.floating_pl) || 0;
    if (currentFloating !== 0) {
        summary += `- **Current Floating P/L:** $${currentFloating.toFixed(2)}\n`;
    }

    // Sample key points along the curve (up to 20 evenly spaced)
    const sampleCount = Math.min(20, total);
    const step = Math.max(1, Math.floor(total / sampleCount));
    summary += '\n**Equity Curve Samples:**\n';
    for (let i = 0; i < total; i += step) {
        const s = snapshots[i];
        const eq = Number(s.equity);
        const bal = Number(s.balance);
        const fl = Number(s.floating_pl) || 0;
        summary += `${formatTime(s.timestamp)}: Equity $${eq.toFixed(2)}, Balance $${bal.toFixed(2)}${fl !== 0 ? `, Float $${fl.toFixed(2)}` : ''}\n`;
    }

    // Recovery analysis
    if (maxDD > 5) {
        const peakTime = new Date(snapshots[maxDDPeakIdx].timestamp).getTime();
        const troughTime = new Date(snapshots[maxDDTroughIdx].timestamp).getTime();
        const ddDurationHrs = ((troughTime - peakTime) / (1000 * 60 * 60)).toFixed(1);
        summary += `\n**Drawdown Duration:** ${ddDurationHrs} hours from peak to trough\n`;

        // Check if recovered
        const peakVal = Number(snapshots[maxDDPeakIdx].equity);
        let recovered = false;
        for (let i = maxDDTroughIdx + 1; i < total; i++) {
            if (Number(snapshots[i].equity) >= peakVal) {
                const recoveryTime = new Date(snapshots[i].timestamp).getTime();
                const recoveryHrs = ((recoveryTime - troughTime) / (1000 * 60 * 60)).toFixed(1);
                summary += `**Recovery:** Recovered in ${recoveryHrs} hours after trough\n`;
                recovered = true;
                break;
            }
        }
        if (!recovered) {
            summary += '**Recovery:** Not yet recovered from max drawdown\n';
        }
    }

    return summary;
}

function summarizeCompetition(allStats: any[], traderId: string): string {
    if (!allStats || allStats.length === 0) return 'No competition data available.';

    // Deduplicate to latest entry per participant
    const seen = new Set<string>();
    const latestPerParticipant: any[] = [];
    for (const s of allStats) {
        if (!seen.has(s.participant_id)) {
            seen.add(s.participant_id);
            latestPerParticipant.push(s);
        }
    }

    // Sort by points desc
    latestPerParticipant.sort((a, b) => Number(b.points) - Number(a.points) || Number(b.profit) - Number(a.profit));

    const totalParticipants = latestPerParticipant.length;
    const traderIndex = latestPerParticipant.findIndex(s => s.participant_id === traderId);
    const traderStats = traderIndex >= 0 ? latestPerParticipant[traderIndex] : null;
    const rank = traderIndex >= 0 ? traderIndex + 1 : 0;
    const percentile = totalParticipants > 0 ? ((rank / totalParticipants) * 100).toFixed(0) : 'N/A';

    // Field averages
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const fieldWinRates = latestPerParticipant.map(s => Number(s.win_rate) || 0);
    const fieldProfits = latestPerParticipant.map(s => Number(s.profit) || 0);
    const fieldPFs = latestPerParticipant.map(s => Number(s.profit_factor) || 0);
    const fieldDDs = latestPerParticipant.map(s => Number(s.max_drawdown) || 0);
    const fieldTrades = latestPerParticipant.map(s => Number(s.total_trades) || 0);

    // Top 3 averages
    const top3 = latestPerParticipant.slice(0, Math.min(3, totalParticipants));
    const top3AvgProfit = avg(top3.map(s => Number(s.profit) || 0));
    const top3AvgWR = avg(top3.map(s => Number(s.win_rate) || 0));

    let summary = `### Competition Context (${totalParticipants} participants)\n`;
    summary += `- **Rank:** #${rank} of ${totalParticipants} (top ${percentile}%)\n`;

    if (traderStats) {
        summary += `\n**This Trader vs Field Average:**\n`;
        summary += `| Metric | This Trader | Field Avg | Top 3 Avg |\n`;
        summary += `|--------|-------------|-----------|----------|\n`;
        summary += `| Profit | $${Number(traderStats.profit).toFixed(2)} | $${avg(fieldProfits).toFixed(2)} | $${top3AvgProfit.toFixed(2)} |\n`;
        summary += `| Win Rate | ${Number(traderStats.win_rate).toFixed(1)}% | ${avg(fieldWinRates).toFixed(1)}% | ${top3AvgWR.toFixed(1)}% |\n`;
        summary += `| Profit Factor | ${Number(traderStats.profit_factor).toFixed(2)} | ${avg(fieldPFs).toFixed(2)} | ${avg(top3.map(s => Number(s.profit_factor) || 0)).toFixed(2)} |\n`;
        summary += `| Max Drawdown | ${Number(traderStats.max_drawdown).toFixed(1)}% | ${avg(fieldDDs).toFixed(1)}% | ${avg(top3.map(s => Number(s.max_drawdown) || 0)).toFixed(1)}% |\n`;
        summary += `| Total Trades | ${traderStats.total_trades} | ${avg(fieldTrades).toFixed(0)} | ${avg(top3.map(s => Number(s.total_trades) || 0)).toFixed(0)} |\n`;
    }

    // Leaderboard snapshot (top 5 + trader position)
    summary += `\n**Leaderboard (Top 5):**\n`;
    const showCount = Math.min(5, totalParticipants);
    for (let i = 0; i < showCount; i++) {
        const s = latestPerParticipant[i];
        const name = s.participants?.nickname || `Trader ${i + 1}`;
        const marker = s.participant_id === traderId ? ' <-- THIS TRADER' : '';
        summary += `${i + 1}. ${name}: ${s.points} pts, $${Number(s.profit).toFixed(2)}, WR ${Number(s.win_rate).toFixed(1)}%${marker}\n`;
    }
    // Show trader position if not in top 5
    if (traderIndex >= 5) {
        const s = latestPerParticipant[traderIndex];
        const name = s.participants?.nickname || 'This Trader';
        summary += `...\n${rank}. ${name}: ${s.points} pts, $${Number(s.profit).toFixed(2)}, WR ${Number(s.win_rate).toFixed(1)}% <-- THIS TRADER\n`;
    }

    return summary;
}

// ─── Context Formatting ──────────────────────────────────────────────

function formatTradeHistory(trades: any[]): string {
    if (!trades || trades.length === 0) return '\n### Recent Trades\nNo trade history available.';

    const rows = trades.map((t: any, i: number) =>
        `${i + 1}. ${t.symbol} ${t.type} ${t.lot_size}lot | Open: ${t.open_price} -> Close: ${t.close_price} | SL: ${t.sl || '-'} TP: ${t.tp || '-'} | P/L: $${Number(t.profit).toFixed(2)} | ${t.open_time} -> ${t.close_time}`
    ).join('\n');

    return `\n### Recent Trades (${trades.length} trades)\n${rows}`;
}

function formatTraderContextFromDB(data: FetchedTraderData): string {
    const { participant, latestStats: s, dailyHistory, trades, equitySnapshots, competitionStats } = data;
    const nickname = participant?.nickname || 'Unknown';

    let context = `## Trader: ${nickname}\n\n`;

    // Current stats
    if (s) {
        context += `### Current Performance\n`;
        context += `- Profit: $${Number(s.profit).toFixed(2)}\n`;
        context += `- Points: ${s.points}\n`;
        context += `- Balance: $${Number(s.balance).toFixed(2)}\n`;
        context += `- Equity: $${Number(s.equity).toFixed(2)}\n\n`;

        context += `### Statistics\n`;
        context += `- Win Rate: ${Number(s.win_rate).toFixed(2)}%\n`;
        context += `- Profit Factor: ${Number(s.profit_factor).toFixed(2)}\n`;
        context += `- RR Ratio: ${Number(s.rr_ratio).toFixed(2)}\n`;
        context += `- Max Drawdown: ${Number(s.max_drawdown).toFixed(1)}%\n`;
        context += `- Total Trades: ${s.total_trades}\n\n`;

        context += `### Win/Loss Analysis\n`;
        context += `- Avg Win: $${Number(s.avg_win).toFixed(2)}\n`;
        context += `- Avg Loss: $${Number(s.avg_loss).toFixed(2)}\n`;
        context += `- Best Trade: $${Number(s.best_trade).toFixed(2)}\n`;
        context += `- Worst Trade: $${Number(s.worst_trade).toFixed(2)}\n`;
        context += `- Long Win Rate: ${Number(s.win_rate_buy).toFixed(1)}%\n`;
        context += `- Short Win Rate: ${Number(s.win_rate_sell).toFixed(1)}%\n\n`;

        context += `### Consistency\n`;
        context += `- Max Consecutive Wins: ${s.max_consecutive_wins || 0}\n`;
        context += `- Max Consecutive Losses: ${s.max_consecutive_losses || 0}\n\n`;

        context += `### Session Performance\n`;
        context += `- Asian: WR ${Number(s.session_asian_win_rate).toFixed(1)}%, Profit $${Number(s.session_asian_profit).toFixed(2)}\n`;
        context += `- London: WR ${Number(s.session_london_win_rate).toFixed(1)}%, Profit $${Number(s.session_london_profit).toFixed(2)}\n`;
        context += `- New York: WR ${Number(s.session_newyork_win_rate).toFixed(1)}%, Profit $${Number(s.session_newyork_profit).toFixed(2)}\n\n`;

        context += `### Trading Style\n`;
        context += `- Style: ${s.trading_style || 'Unknown'}\n`;
        context += `- Favorite Pair: ${s.favorite_pair || '-'}\n`;
        context += `- Avg Holding Time: ${s.avg_holding_time || '-'}\n\n`;
    }

    // Historical progression
    context += summarizeDailyProgression(dailyHistory) + '\n\n';

    // Equity curve
    context += summarizeEquitySnapshots(equitySnapshots) + '\n\n';

    // Trades
    context += formatTradeHistory(trades) + '\n\n';

    // Competition context
    context += summarizeCompetition(competitionStats, participant?.id || '') + '\n';

    return context;
}

// Legacy: format from frontend-passed trader object
function formatTraderContextLegacy(trader: any): string {
    return `## Trader: ${trader.nickname}

### Performance Overview
- Rank: ${trader.rank || 'N/A'}
- Total Profit: $${trader.profit?.toFixed(2) || 0}
- Points: ${trader.points || 0}

### Statistics
- Win Rate: ${trader.stats?.winRate?.toFixed(2) || 0}%
- Profit Factor: ${trader.stats?.profitFactor || 0}
- RR Ratio: ${trader.stats?.rrRatio || 0}
- Max Drawdown: ${trader.stats?.maxDrawdown || 0}%
- Total Trades: ${trader.stats?.totalTrades || 0}

### Win/Loss Analysis
- Avg Win: $${trader.stats?.avgWin || 0}
- Avg Loss: $${trader.stats?.avgLoss || 0}
- Best Trade: $${trader.stats?.bestTrade || 0}
- Worst Trade: $${trader.stats?.worstTrade || 0}
- Long Win Rate: ${trader.stats?.winRateBuy?.toFixed(1) || 0}%
- Short Win Rate: ${trader.stats?.winRateSell?.toFixed(1) || 0}%

### Consistency
- Max Consecutive Wins: ${trader.stats?.maxConsecutiveWins || 0}
- Max Consecutive Losses: ${trader.stats?.maxConsecutiveLosses || 0}

### Session Performance
- Asian: Win Rate ${trader.stats?.sessionAsianWinRate?.toFixed(1) || 0}%, Profit $${trader.stats?.sessionAsianProfit?.toFixed(2) || 0}
- London: Win Rate ${trader.stats?.sessionLondonWinRate?.toFixed(1) || 0}%, Profit $${trader.stats?.sessionLondonProfit?.toFixed(2) || 0}
- New York: Win Rate ${trader.stats?.sessionNewYorkWinRate?.toFixed(1) || 0}%, Profit $${trader.stats?.sessionNewYorkProfit?.toFixed(2) || 0}

### Trading Style
- Style: ${trader.stats?.tradingStyle || 'Unknown'}
- Favorite Pair: ${trader.stats?.favoritePair || '-'}
- Avg Holding Time: ${trader.stats?.avgHoldingTime || '-'}${formatTradeHistoryLegacy(trader.history)}`;
}

function formatTradeHistoryLegacy(trades: any[]): string {
    if (!trades || trades.length === 0) return '\n### Recent Trades\nNo trade history available.';
    const recent = trades.slice(0, 15);
    const rows = recent.map((t: any, i: number) =>
        `${i + 1}. ${t.symbol} ${t.type} ${t.lot}lot | Open: ${t.openPrice} -> Close: ${t.closePrice} | SL: ${t.sl || '-'} TP: ${t.tp || '-'} | P/L: $${t.profit?.toFixed?.(2) ?? t.profit} | ${t.openTime} -> ${t.closeTime}`
    ).join('\n');
    return `\n### Recent Trades (${recent.length} of ${trades.length})\n${rows}`;
}

// ─── Enhanced Prompts ────────────────────────────────────────────────

const ANALYSIS_PROMPTS: Record<string, string> = {
    overview: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพระดับสูง วิเคราะห์ภาพรวม Performance ของเทรดเดอร์นี้อย่างละเอียด โดยครอบคลุม:
- จุดเด่นที่โดดเด่นที่สุด (อ้างอิงตัวเลขจริง)
- จุดที่ควรปรับปรุงเร่งด่วน
- พัฒนาการจากจุดเริ่มต้นจนถึงปัจจุบัน (ดูจาก Historical Progression)
- พฤติกรรม Equity Curve (drawdown recovery, consistency)
- ตำแหน่งในการแข่งขันเทียบกับคู่แข่งคนอื่น (ดูจาก Competition Context)
- ข้อสรุปและคำแนะนำเชิงกลยุทธ์
ใช้ภาษาไทย วิเคราะห์ตรงจุด อ้างอิงข้อมูลจริง ใช้ emoji ให้เหมาะสม`,

    winrate: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพระดับสูง วิเคราะห์ Win Rate และ Risk-Reward ของเทรดเดอร์นี้อย่างลึกซึ้ง:
- Win Rate ปัจจุบันเทียบกับมาตรฐาน และเทียบกับคู่แข่งในการแข่งขัน
- Win Rate เปลี่ยนแปลงอย่างไรตลอดช่วงเวลา (ดูจาก Historical Progression)
- RR Ratio สมเหตุสมผลไหม Avg Win vs Avg Loss
- Long vs Short Win Rate - มีด้านที่ถนัดกว่าไหม
- ความสัมพันธ์ระหว่าง Win Rate กับ Profit Factor
- Consecutive Wins vs Losses บอกอะไรเกี่ยวกับ consistency
- ข้อเสนอแนะเชิงกลยุทธ์เพื่อปรับปรุง
ใช้ภาษาไทย วิเคราะห์ตรงจุด อ้างอิงข้อมูลจริง ใช้ emoji ให้เหมาะสม`,

    risk: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพระดับสูง วิเคราะห์ความเสี่ยงของเทรดเดอร์นี้อย่างละเอียด:
- Max Drawdown เสี่ยงแค่ไหน เทียบกับมาตรฐานและคู่แข่ง
- Equity Curve drawdown patterns: ลึกแค่ไหน, ฟื้นตัวเร็วไหม (ดูจาก Equity Curve Analysis)
- Consecutive Losses น่าเป็นห่วงไหม
- Worst Trade vs Avg Loss - มี outlier ที่อันตรายไหม
- การใช้ SL/TP ดีแค่ไหน (ดูจาก trades)
- Lot size consistency - เสี่ยง oversize ไหม
- พัฒนาการด้าน risk management ดีขึ้นหรือแย่ลง (ดูจาก Historical Progression)
- ข้อเสนอแนะด้านการจัดการความเสี่ยง
ใช้ภาษาไทย วิเคราะห์ตรงจุด อ้างอิงข้อมูลจริง ใช้ emoji ให้เหมาะสม`,

    trend: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพระดับสูง วิเคราะห์แนวโน้มและ Trading Style อย่างละเอียด:
- Trading Style เป็นแบบไหน (Scalping/Day/Swing) สอดคล้องกับผลลัพธ์ไหม
- Session ไหนเทรดได้ดีที่สุด/แย่ที่สุด (Asian/London/NY) - ควรเน้นหรือหลีกเลี่ยง session ไหน
- คู่เงินที่ถนัด กระจายความเสี่ยงดีไหม (ดูจาก trades)
- Holding time pattern - สอดคล้องกับ style ไหม
- พัฒนาการ style เปลี่ยนไปอย่างไร (ดูจาก Historical Progression)
- ข้อเสนอแนะเพื่อ optimize trading style
ใช้ภาษาไทย วิเคราะห์ตรงจุด อ้างอิงข้อมูลจริง ใช้ emoji ให้เหมาะสม`,

    compare: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพระดับสูง เปรียบเทียบเทรดเดอร์นี้กับคู่แข่งจริงในการแข่งขัน:
- อันดับและ percentile ในการแข่งขัน
- เปรียบเทียบกับค่าเฉลี่ยของสนามและ Top 3 (ดูจาก Competition Context)
- จุดเด่นที่เหนือกว่าคู่แข่ง
- จุดที่ต้องพัฒนาเพื่อขยับอันดับ
- เปรียบเทียบกับมาตรฐานเทรดเดอร์มืออาชีพ
- ศักยภาพในอนาคตและ roadmap สู่ Top 3
ใช้ภาษาไทย วิเคราะห์ตรงจุด อ้างอิงข้อมูลจริง ใช้ emoji ให้เหมาะสม`,

    daily: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพระดับสูง วิเคราะห์ Daily P/L Pattern ของเทรดเดอร์นี้อย่างละเอียด:
- วันไหนทำกำไรได้ดีที่สุด/แย่ที่สุด (วิเคราะห์จาก Historical Progression รายวัน)
- รูปแบบรายวัน: เทรดได้ดีวันต้นสัปดาห์หรือท้ายสัปดาห์ มีความสม่ำเสมอไหม
- ช่วงเวลาที่ควรหยุดพัก (losing streak หรือวันที่ผลแย่ต่อเนื่อง)
- ความ volatile ของ daily P/L เทียบกับมาตรฐาน
- ข้อเสนอแนะเชิงกลยุทธ์ เช่น daily loss limit หรือ target
ใช้ภาษาไทย วิเคราะห์ตรงจุด อ้างอิงข้อมูลจริง ใช้ emoji ให้เหมาะสม`,

    lotsize: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพระดับสูง วิเคราะห์ Lot Size และ Position Sizing ของเทรดเดอร์นี้:
- Lot size ที่ใช้บ่อยที่สุดและการกระจาย (ดูจาก Recent Trades)
- มีความสม่ำเสมอไหม หรือ oversizing ในบางเทรด
- ความสัมพันธ์ระหว่าง lot size กับ profit/loss (เทรด lot ใหญ่แล้วผลเป็นยังไง)
- เทรดที่ใช้ lot ผิดปกติ (ใหญ่หรือเล็กกว่าปกติ) มีผลอย่างไร
- Risk per trade คิดเป็น % ของ balance โดยประมาณ
- ข้อเสนอแนะด้าน position sizing เพื่อ optimize ผลลัพธ์
ใช้ภาษาไทย วิเคราะห์ตรงจุด อ้างอิงข้อมูลจริง ใช้ emoji ให้เหมาะสม`
};

// ─── Streaming ───────────────────────────────────────────────────────

function streamWithOpenAI(systemPrompt: string, userContent: string): ReadableStream {
    const openai = getOpenAIClient();
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            try {
                const stream = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.5,
                    stream: true,
                });

                for await (const chunk of stream) {
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
}

function streamWithGemini(systemPrompt: string, userContent: string): ReadableStream {
    const genAI = getGeminiClient();
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            try {
                const model = genAI.getGenerativeModel({
                    model: 'gemini-flash-latest',
                    systemInstruction: systemPrompt
                });
                const result = await model.generateContentStream(userContent);

                for await (const chunk of result.stream) {
                    const content = chunk.text();
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
}

// ─── Request Handler ─────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { traderId, trader, analysisType, customPrompt, provider = 'openai' } = await request.json();

        if (!traderId && !trader) {
            return aiError('bad_request', 'ไม่พบข้อมูลเทรดเดอร์สำหรับการวิเคราะห์', false, 400);
        }

        if (provider !== 'gemini' && provider !== 'openai') {
            return aiError('bad_request', 'รูปแบบผู้ให้บริการ AI ไม่ถูกต้อง', false, 400);
        }

        if (provider === 'gemini' && !env.GEMINI_API_KEY) {
            return aiError('misconfigured', 'Gemini ยังไม่ได้ตั้งค่าระบบ', false, 500);
        }
        if (provider === 'openai' && !env.OPENAI_API_KEY) {
            return aiError('misconfigured', 'OpenAI ยังไม่ได้ตั้งค่าระบบ', false, 500);
        }

        // Prompt injection mitigation: validate custom prompt
        if (analysisType === 'custom') {
            if (!customPrompt || typeof customPrompt !== 'string' || customPrompt.trim().length === 0) {
                return aiError('bad_request', 'กรุณาระบุคำถาม', false, 400);
            }
            if (customPrompt.length > 500) {
                return aiError('bad_request', 'คำถามต้องไม่เกิน 500 ตัวอักษร', false, 400);
            }
        }

        // Build context: server-side (new) or legacy (old)
        let userContent: string;

        if (traderId) {
            const data = await fetchTraderData(traderId);
            if (!data.participant) {
                return aiError('bad_request', 'ไม่พบเทรดเดอร์นี้ในระบบ', false, 404);
            }
            userContent = formatTraderContextFromDB(data);
        } else {
            userContent = formatTraderContextLegacy(trader);
        }

        // System prompt
        let systemPrompt = ANALYSIS_PROMPTS[analysisType] || ANALYSIS_PROMPTS.overview;

        if (analysisType === 'custom') {
            systemPrompt = `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพระดับสูง ตอบคำถามของผู้ใช้เกี่ยวกับข้อมูลเทรดเดอร์ที่ให้มา วิเคราะห์จากข้อมูลทั้งหมดที่มี รวมถึง Historical Progression, Equity Curve, Competition Context และ Trade History ใช้ภาษาไทย ตรงจุด อ้างอิงข้อมูลจริง ใช้ emoji ให้เหมาะสม`;
        }

        if (analysisType === 'custom' && customPrompt) {
            userContent += `\n\n### คำถามจากผู้ใช้\n${customPrompt.trim()}`;
        }

        // Stream response
        const stream = provider === 'gemini'
            ? streamWithGemini(systemPrompt, userContent)
            : streamWithOpenAI(systemPrompt, userContent);

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });
    } catch (error) {
        console.error('AI Analysis error:', error);
        const status =
            error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
                ? error.status
                : undefined;
        const message =
            error instanceof Error ? error.message : 'Unknown error';

        if (status === 429 || message.toLowerCase().includes('rate limit')) {
            return aiError(
                'rate_limited',
                'AI ถูกใช้งานหนาแน่นเกินไป กรุณาลองใหม่อีกครั้ง',
                true,
                429
            );
        }

        if (
            message.includes('API_KEY') ||
            message.includes('not configured')
        ) {
            return aiError(
                'misconfigured',
                'AI ยังไม่พร้อมใช้งานในขณะนี้',
                false,
                500
            );
        }

        if (status && status >= 400 && status < 500) {
            return aiError(
                'bad_request',
                'คำขอวิเคราะห์ไม่ถูกต้อง กรุณาลองใหม่',
                false,
                status
            );
        }

        return aiError(
            'provider_unavailable',
            'ไม่สามารถสร้างคำวิเคราะห์ได้ในขณะนี้ กรุณาลองใหม่',
            true,
            500
        );
    }
};
