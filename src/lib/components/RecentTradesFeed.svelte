<script lang="ts">
    import { onMount } from 'svelte';

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

    let commentaries: Record<string, string> = {};
    let loadingCommentary = false;

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

    async function loadCommentaries() {
        if (trades.length === 0 || loadingCommentary) return;

        // Only get commentary for notable trades (big profit/loss)
        const notableTrades = trades
            .filter(t => Math.abs(t.profit) >= 20)
            .slice(0, 5)
            .map(t => ({
                id: t.id,
                participantId: t.participantId,
                nickname: t.nickname,
                symbol: t.symbol,
                type: t.type,
                lot: t.lotSize,
                profit: t.profit,
            }));

        if (notableTrades.length === 0) return;

        loadingCommentary = true;
        try {
            const res = await fetch('/api/ai-commentary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trades: notableTrades }),
            });

            if (res.ok) {
                const data = await res.json();
                for (const c of data.commentaries || []) {
                    if (c.tradeId && c.commentary) {
                        commentaries[c.tradeId] = c.commentary;
                    }
                }
                commentaries = commentaries; // trigger reactivity
            }
        } catch {
            // silently fail - commentary is optional
        } finally {
            loadingCommentary = false;
        }
    }

    onMount(() => {
        loadCommentaries();
    });
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
        {#if commentaries[trade.id]}
            <div class="ml-4 mr-2 -mt-1 mb-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-400 dark:border-amber-600 rounded-r-lg text-xs text-gray-600 dark:text-gray-400 italic">
                🤖 {commentaries[trade.id]}
            </div>
        {/if}
    {/each}

    {#if trades.length === 0}
        <div class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No recent trades yet
        </div>
    {/if}
</div>
