import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { supabase } from '$lib/supabase';

const TELEGRAM_API = 'https://api.telegram.org/bot';

async function verifyTelegramChatId(botToken: string, chatId: string): Promise<{ ok: boolean; name?: string }> {
    try {
        const res = await fetch(`${TELEGRAM_API}${botToken}/getChat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId })
        });
        const data = await res.json();
        if (data.ok) {
            const chat = data.result;
            const name = chat.first_name || chat.title || chat.username || 'Unknown';
            return { ok: true, name };
        }
        return { ok: false };
    } catch {
        return { ok: false };
    }
}

async function sendWelcomeMessage(botToken: string, chatId: string, nickname: string) {
    try {
        await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `✅ เชื่อมต่อสำเร็จ!\n\nสวัสดี ${nickname} — ตอนนี้คุณจะได้รับแจ้งเตือนส่วนตัวเมื่อ:\n🔥 อันดับเปลี่ยนแปลง\n💰 ปิดเทรดกำไร/ขาดทุนเยอะ\n🎯 ชนะติดต่อกันหลายไม้\n⚠️ Drawdown สูง\n\nจาก Elite Gold Competition`,
                parse_mode: 'HTML'
            })
        });
    } catch {
        // Non-critical, ignore
    }
}

// POST: Link Telegram chat ID to participant
export const POST = async ({ request }: RequestEvent) => {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        return json({ error: 'Telegram bot not configured' }, { status: 500 });
    }

    const { participant_id, chat_id } = await request.json();

    if (!participant_id || !chat_id) {
        return json({ error: 'participant_id and chat_id are required' }, { status: 400 });
    }

    const chatIdStr = String(chat_id).trim();

    // Verify chat_id is valid by calling Telegram API
    const verification = await verifyTelegramChatId(botToken, chatIdStr);
    if (!verification.ok) {
        return json({ error: 'ไม่พบ Chat ID นี้ — ต้องส่งข้อความหา Bot ก่อน' }, { status: 400 });
    }

    // Get participant nickname
    const { data: participant } = await supabase
        .from('participants')
        .select('nickname')
        .eq('id', participant_id)
        .single();

    // Save to participants table
    const { error } = await supabase
        .from('participants')
        .update({ telegram_chat_id: chatIdStr })
        .eq('id', participant_id);

    if (error) {
        console.error('Failed to save telegram_chat_id:', error);
        return json({ error: 'Failed to link Telegram' }, { status: 500 });
    }

    // Send welcome message
    await sendWelcomeMessage(botToken, chatIdStr, participant?.nickname || 'Trader');

    return json({ success: true, telegram_name: verification.name });
};

// DELETE: Unlink Telegram from participant
export const DELETE = async ({ request }: RequestEvent) => {
    const { participant_id } = await request.json();

    if (!participant_id) {
        return json({ error: 'participant_id is required' }, { status: 400 });
    }

    const { error } = await supabase
        .from('participants')
        .update({ telegram_chat_id: null })
        .eq('id', participant_id);

    if (error) {
        console.error('Failed to unlink telegram:', error);
        return json({ error: 'Failed to unlink Telegram' }, { status: 500 });
    }

    return json({ success: true });
};

// GET: Check if participant has Telegram linked
export const GET = async ({ url }: RequestEvent) => {
    const participantId = url.searchParams.get('participant_id');

    if (!participantId) {
        return json({ error: 'participant_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('participants')
        .select('telegram_chat_id')
        .eq('id', participantId)
        .single();

    if (error) {
        return json({ error: 'Participant not found' }, { status: 404 });
    }

    return json({
        linked: !!data.telegram_chat_id,
        chat_id: data.telegram_chat_id
    });
};
