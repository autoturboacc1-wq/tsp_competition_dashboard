import { env } from '$env/dynamic/private';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export type AIProvider = 'openai' | 'gemini' | 'minimax';

export function getDefaultProvider(): AIProvider {
    const p = env.AI_PROVIDER ?? 'openai';
    if (p === 'minimax' || p === 'gemini' || p === 'openai') return p;
    return 'openai';
}

export function getDefaultModel(provider: AIProvider): string {
    switch (provider) {
        case 'minimax':
            return env.MINIMAX_MODEL ?? 'MiniMax-M2.5';
        case 'gemini':
            return 'gemini-flash-latest';
        case 'openai':
            return env.OPENAI_MODEL ?? 'gpt-4o';
    }
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export function streamAI(
    provider: AIProvider,
    model: string,
    systemPrompt: string,
    userContent: string,
    temperature = 0.5
): ReadableStream {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            const enqueue = (content: string) =>
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            const done = () =>
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            const error = (msg: string) =>
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));

            try {
                if (provider === 'openai') {
                    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
                    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
                    const stream = await openai.chat.completions.create({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userContent }
                        ],
                        temperature,
                        stream: true,
                    });
                    for await (const chunk of stream) {
                        const text = chunk.choices[0]?.delta?.content || '';
                        if (text) enqueue(text);
                    }

                } else if (provider === 'gemini') {
                    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
                    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
                    const geminiModel = genAI.getGenerativeModel({
                        model,
                        systemInstruction: systemPrompt
                    });
                    const result = await geminiModel.generateContentStream(userContent);
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) enqueue(text);
                    }

                } else {
                    // minimax
                    if (!env.MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY not configured');
                    const response = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${env.MINIMAX_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userContent }
                            ],
                            temperature,
                            stream: true,
                        }),
                    });

                    if (!response.ok || !response.body) {
                        const errText = await response.text();
                        throw new Error(`Minimax API error ${response.status}: ${errText}`);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { done: readerDone, value } = await reader.read();
                        if (readerDone) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() ?? '';

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const payload = line.slice(6).trim();
                            if (payload === '[DONE]') break;
                            try {
                                const json = JSON.parse(payload);
                                const text = json.choices?.[0]?.delta?.content ?? '';
                                if (text) enqueue(text);
                            } catch {
                                // skip malformed chunk
                            }
                        }
                    }
                }

                done();
            } catch (e) {
                error(e instanceof Error ? e.message : 'Stream error');
            } finally {
                controller.close();
            }
        }
    });
}

// ─── Non-streaming ────────────────────────────────────────────────────────────

export async function callAI(
    provider: AIProvider,
    model: string,
    systemPrompt: string,
    userContent: string,
    temperature = 0.7,
    maxTokens = 500
): Promise<string> {
    if (provider === 'openai') {
        if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            temperature,
            max_tokens: maxTokens,
        });
        return completion.choices[0]?.message?.content ?? '';
    }

    if (provider === 'gemini') {
        if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const geminiModel = genAI.getGenerativeModel({
            model,
            systemInstruction: systemPrompt
        });
        const result = await geminiModel.generateContent(userContent);
        return result.response.text() ?? '';
    }

    // minimax
    if (!env.MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY not configured');
    const response = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.MINIMAX_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            temperature,
            max_completion_tokens: maxTokens,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Minimax API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    // Check application-level error
    if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
        throw new Error(`Minimax error: ${data.base_resp.status_msg}`);
    }

    return data.choices?.[0]?.message?.content ?? '';
}
