<script lang="ts">
    export let trades: Array<{
        id: string;
        participantId: string;
        nickname: string;
        symbol: string;
        type: string;
        lotSize: number;
        profit: number;
        closeTime: string;
    }> = [];

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
</script>

<div class="space-y-2">
    {#each trades as trade, i}
        <a
            href="/leaderboard/{trade.participantId}"
            class="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border card-hover animate-fade-in-up stagger-{Math.min(i + 1, 8)}"
        >
            <div class="flex items-center gap-3 min-w-0">
                <span
                    class="shrink-0 text-xs font-bold px-2 py-0.5 rounded {trade.type === 'BUY'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}"
                >
                    {trade.type}
                </span>
                <div class="min-w-0">
                    <div class="text-sm font-medium truncate dark:text-white">
                        <span class="text-gray-500 dark:text-gray-400">{trade.nickname}</span>
                        <span class="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span class="font-semibold">{trade.symbol}</span>
                    </div>
                    <div class="text-xs text-gray-400 dark:text-gray-500">
                        {trade.lotSize} lots · {timeAgo(trade.closeTime)}
                    </div>
                </div>
            </div>
            <span
                class="shrink-0 text-sm font-semibold tabular-nums {trade.profit >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'}"
            >
                {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
            </span>
        </a>
    {/each}

    {#if trades.length === 0}
        <div class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No recent trades yet
        </div>
    {/if}
</div>
