-- Add personal Telegram chat ID to participants
ALTER TABLE participants ADD COLUMN IF NOT EXISTS telegram_chat_id text;

CREATE INDEX IF NOT EXISTS idx_participants_telegram ON participants(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
