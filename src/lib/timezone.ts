export const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000;
export const THAILAND_OFFSET_SECONDS = 7 * 60 * 60;
export const THAILAND_TIMEZONE = 'Asia/Bangkok';

export function getTodayDateThai(): string {
    const now = new Date();
    const thaiDate = new Date(now.getTime() + THAILAND_OFFSET_MS);
    return thaiDate.toISOString().slice(0, 10);
}
