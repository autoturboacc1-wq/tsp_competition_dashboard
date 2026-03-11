<script lang="ts">
    export let totalPoints: number = 0;
    export let totalTrades: number = 0;
    export let sessionAsianProfit: number = 0;
    export let sessionLondonProfit: number = 0;
    export let sessionNewYorkProfit: number = 0;
    export let bestTrade: number = 0;
    export let worstTrade: number = 0;

    $: pipsPerTrade = totalTrades > 0 ? totalPoints / totalTrades : 0;
    $: totalSessionPips = Math.abs(sessionAsianProfit) + Math.abs(sessionLondonProfit) + Math.abs(sessionNewYorkProfit);

    $: sessions = [
        { name: 'Asian', pips: sessionAsianProfit, color: 'bg-blue-500' },
        { name: 'London', pips: sessionLondonProfit, color: 'bg-green-500' },
        { name: 'New York', pips: sessionNewYorkProfit, color: 'bg-amber-500' }
    ];
</script>

<div class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 card-hover">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-5">
        Points Breakdown
    </h3>

    <!-- Main Score -->
    <div class="text-center mb-6">
        <div class="text-4xl font-bold text-amber-500">
            {totalPoints.toLocaleString()}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Points (Pips)</div>
    </div>

    <!-- Key Metrics -->
    <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg text-center">
            <div class="text-xs text-gray-500 dark:text-gray-400">Pips/Trade</div>
            <div class="text-lg font-bold {pipsPerTrade >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                {pipsPerTrade.toFixed(1)}
            </div>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg text-center">
            <div class="text-xs text-gray-500 dark:text-gray-400">Total Trades</div>
            <div class="text-lg font-bold text-gray-900 dark:text-white">
                {totalTrades}
            </div>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg text-center">
            <div class="text-xs text-gray-500 dark:text-gray-400">Best Trade</div>
            <div class="text-lg font-bold text-green-600 dark:text-green-400">
                +${bestTrade.toFixed(2)}
            </div>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg text-center">
            <div class="text-xs text-gray-500 dark:text-gray-400">Worst Trade</div>
            <div class="text-lg font-bold text-red-600 dark:text-red-400">
                ${worstTrade.toFixed(2)}
            </div>
        </div>
    </div>

    <!-- Session Contribution -->
    <div>
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Profit by Session
        </div>
        <div class="space-y-2">
            {#each sessions as session}
                {@const barWidth = totalSessionPips > 0 ? (Math.abs(session.pips) / totalSessionPips) * 100 : 0}
                <div class="flex items-center gap-3">
                    <div class="w-16 text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">{session.name}</div>
                    <div class="flex-1 h-5 bg-gray-100 dark:bg-dark-bg/50 rounded overflow-hidden">
                        <div
                            class="h-full rounded transition-all duration-700 {session.pips >= 0 ? 'bg-green-500/40' : 'bg-red-500/40'}"
                            style="width: {Math.max(barWidth, 2)}%"
                        ></div>
                    </div>
                    <div class="w-20 text-right text-xs font-mono font-bold {session.pips >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                        {session.pips >= 0 ? '+' : ''}{session.pips.toFixed(2)}
                    </div>
                </div>
            {/each}
        </div>
    </div>

    <!-- How it works -->
    <div class="mt-5 pt-4 border-t border-gray-100 dark:border-dark-border">
        <p class="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            Points = total pips gained across all closed trades. Each pip is calculated as (price difference / symbol point size). Higher points = more pips captured.
        </p>
    </div>
</div>
