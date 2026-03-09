/**
 * Simple in-memory cache with TTL for server-side data
 */
const cache = new Map<string, { data: any; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data as T;
}

export function setCache(key: string, data: any, ttlMs: number = 30_000): void {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs
    });
}

export function invalidateCache(key: string): void {
    cache.delete(key);
}

export function invalidateAll(): void {
    cache.clear();
}
