<script lang="ts">
    export let data: Array<{
        symbol: string;
        buyLots: number;
        sellLots: number;
        buyCount: number;
        sellCount: number;
    }> = [];

    $: totalPositions = data.reduce((s, d) => s + d.buyCount + d.sellCount, 0);

    function buyPct(row: typeof data[0]): number {
        const total = row.buyLots + row.sellLots;
        return total === 0 ? 50 : Math.round((row.buyLots / total) * 100);
    }

    function sentiment(pct: number): { label: string; color: string } {
        if (pct >= 65) return { label: 'LONG', color: 'text-green-600 dark:text-green-400' };
        if (pct <= 35) return { label: 'SHORT', color: 'text-red-600 dark:text-red-400' };
        return { label: 'MIXED', color: 'text-amber-500 dark:text-amber-400' };
    }
</script>

<div class="rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border overflow-hidden">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border">
        <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold dark:text-white uppercase tracking-wider">Market Sentiment</h2>
            {#if totalPositions > 0}
                <span class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE
                </span>
            {/if}
        </div>
        <span class="text-xs text-gray-400 dark:text-gray-500">{totalPositions} open</span>
    </div>

    {#if data.length === 0}
        <div class="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
            No open positions
        </div>
    {:else}
        <div class="divide-y divide-gray-50 dark:divide-dark-border">
            {#each data as row}
                {@const pct = buyPct(row)}
                {@const sent = sentiment(pct)}
                {@const total = row.buyCount + row.sellCount}
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-sm font-semibold dark:text-white">{row.symbol}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-mono tabular-nums {sent.color} font-semibold">{pct}% {sent.label}</span>
                            <span class="text-[10px] text-gray-400 dark:text-gray-500">{total}pos</span>
                        </div>
                    </div>
                    <!-- Bar -->
                    <div class="relative h-2 rounded-full bg-red-100 dark:bg-red-900/30 overflow-hidden">
                        <div
                            class="absolute left-0 top-0 h-full rounded-full bg-green-500 dark:bg-green-400 transition-all duration-500"
                            style="width: {pct}%"
                        ></div>
                    </div>
                    <!-- Sub-labels -->
                    <div class="flex justify-between mt-1">
                        <span class="text-[10px] text-green-600 dark:text-green-500 font-mono">
                            B {row.buyCount} ({row.buyLots.toFixed(2)}L)
                        </span>
                        <span class="text-[10px] text-red-500 dark:text-red-400 font-mono">
                            S {row.sellCount} ({row.sellLots.toFixed(2)}L)
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
