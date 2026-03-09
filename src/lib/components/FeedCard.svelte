<script lang="ts">
    import type { FeedItem } from '$lib/stores/feedStore';

    export let item: FeedItem;

    function timeAgo(dateStr: string): string {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    $: borderClass = item.type === 'trade_closed'
        ? (item.profit !== undefined && item.profit >= 0 ? 'border-l-green-500' : 'border-l-red-500')
        : 'border-l-blue-500';
</script>

<a
    href="/leaderboard/{item.participantId}"
    class="block p-3 rounded-lg bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border border-l-[3px] {borderClass} card-hover animate-fade-in-up"
>
    <div class="flex items-center gap-3">
        <!-- Avatar -->
        <div class="shrink-0 w-9 h-9 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold">
            {item.nickname.charAt(0).toUpperCase()}
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
            <div class="text-sm dark:text-white">
                <span class="font-semibold">{item.nickname}</span>
                {#if item.type === 'trade_opened'}
                    <span class="text-gray-400"> opened a </span>
                    <span class="font-bold {item.tradeType === 'BUY' ? 'text-green-500' : 'text-red-500'}">{item.tradeType}</span>
                {:else}
                    <span class="text-gray-400"> closed </span>
                    <span class="font-bold {item.tradeType === 'BUY' ? 'text-green-500' : 'text-red-500'}">{item.tradeType}</span>
                    {#if item.profit !== undefined}
                        <span class="ml-1 font-semibold tabular-nums {item.profit >= 0 ? 'text-green-500' : 'text-red-500'}">
                            {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)}
                        </span>
                    {/if}
                {/if}
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {item.symbol} · {item.lot} lots · {timeAgo(item.timestamp)}
            </div>
        </div>

        <!-- Type badge -->
        <span class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider
            {item.type === 'trade_opened'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : item.profit !== undefined && item.profit >= 0
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}">
            {item.type === 'trade_opened' ? 'OPEN' : 'CLOSED'}
        </span>
    </div>
</a>
