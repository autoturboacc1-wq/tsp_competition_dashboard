import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
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


// Analysis type prompts (Thai)
const ANALYSIS_PROMPTS: Record<string, string> = {
    overview: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพ วิเคราะห์ภาพรวม Performance ของเทรดเดอร์นี้ โดยครอบคลุม:
- จุดเด่นที่โดดเด่น
- จุดที่ควรปรับปรุง
- ข้อสรุปโดยรวม
ใช้ภาษาไทย กระชับ อ่านง่าย ใช้ emoji ให้เหมาะสม`,

    winrate: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพ วิเคราะห์ Win Rate และ Risk-Reward Ratio ของเทรดเดอร์นี้:
- Win Rate ดีแค่ไหน เทียบกับมาตรฐาน
- RR Ratio สมเหตุสมผลไหม
- ความสัมพันธ์ระหว่าง Win Rate กับ RR
- ข้อเสนอแนะ
ใช้ภาษาไทย กระชับ อ่านง่าย ใช้ emoji ให้เหมาะสม`,

    risk: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพ วิเคราะห์ความเสี่ยงของเทรดเดอร์นี้:
- Max Drawdown เสี่ยงแค่ไหน
- Consecutive Losses น่าเป็นห่วงไหม
- Worst Trade vs Avg Loss
- ข้อเสนอแนะด้านการจัดการความเสี่ยง
ใช้ภาษาไทย กระชับ อ่านง่าย ใช้ emoji ให้เหมาะสม`,

    trend: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพ วิเคราะห์แนวโน้มและ Trading Style ของเทรดเดอร์นี้:
- Trading Style เป็นแบบไหน (Scalping/Day Trading/Swing)
- Session ไหนเทรดได้ดีที่สุด
- คู่เงินที่ถนัด
- ข้อเสนอแนะ
ใช้ภาษาไทย กระชับ อ่านง่าย ใช้ emoji ให้เหมาะสม`,

    compare: `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพ เปรียบเทียบเทรดเดอร์นี้กับมาตรฐานทั่วไป:
- เมื่อเทียบกับเทรดเดอร์ระดับมืออาชีพ
- จุดที่ต้องพัฒนาเพื่อขึ้นไประดับถัดไป
- ศักยภาพในอนาคต
ใช้ภาษาไทย กระชับ อ่านง่าย ใช้ emoji ให้เหมาะสม`
};

// Format trader data for AI context
function formatTraderContext(trader: any): string {
    return `## ข้อมูลเทรดเดอร์: ${trader.nickname}

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
- Avg Holding Time: ${trader.stats?.avgHoldingTime || '-'}`;
}

async function analyzeWithGemini(prompt: string): Promise<string> {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function analyzeWithOpenAI(prompt: string): Promise<string> {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '';
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { trader, analysisType, customPrompt, provider = 'openai' } = await request.json();

        if (!trader) {
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

        let systemPrompt = ANALYSIS_PROMPTS[analysisType] || ANALYSIS_PROMPTS.overview;

        if (analysisType === 'custom' && customPrompt) {
            systemPrompt = `คุณเป็นนักวิเคราะห์การเทรด Forex มืออาชีพ ตอบคำถามต่อไปนี้เกี่ยวกับเทรดเดอร์:

"${customPrompt}"

ใช้ภาษาไทย กระชับ อ่านง่าย ใช้ emoji ให้เหมาะสม`;
        }

        const traderContext = formatTraderContext(trader);
        const fullPrompt = `${systemPrompt}\n\n${traderContext}`;

        let analysis: string;
        if (provider === 'gemini') {
            analysis = await analyzeWithGemini(fullPrompt);
        } else {
            analysis = await analyzeWithOpenAI(fullPrompt);
        }

        return json({ analysis });
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
