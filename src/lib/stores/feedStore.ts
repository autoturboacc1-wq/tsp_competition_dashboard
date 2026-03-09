import { writable } from 'svelte/store';

export type FeedEventType = 'trade_opened' | 'trade_closed';

export type FeedItem = {
    id: string;
    type: FeedEventType;
    participantId: string;
    nickname: string;
    symbol: string;
    tradeType: 'BUY' | 'SELL';
    lot: number;
    profit?: number;
    timestamp: string;
};

function createFeedStore() {
    const { subscribe, update, set } = writable<FeedItem[]>([]);
    const seen = new Set<string>();

    return {
        subscribe,
        addItem: (item: FeedItem) => {
            const key = `${item.id}-${item.type}`;
            if (seen.has(key)) return;
            seen.add(key);
            update(items => [item, ...items].slice(0, 200));
        },
        seed: (items: FeedItem[]) => {
            seen.clear();
            for (const item of items) {
                seen.add(`${item.id}-${item.type}`);
            }
            set(items);
        },
        clear: () => {
            seen.clear();
            set([]);
        }
    };
}

export const feedItems = createFeedStore();
