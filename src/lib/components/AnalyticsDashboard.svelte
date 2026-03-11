<script lang="ts">
    import type { AnalyticsResult } from '$lib/analytics';

    export let analytics: AnalyticsResult;

    function formatRatio(value: number): string {
        if (Math.abs(value) > 99) return value > 0 ? '>99' : '<-99';
        return value.toFixed(2);
    }

    function getRatioColor(value: number): string {
        if (value >= 2) return 'text-green-500';
        if (value >= 1) return 'text-green-600 dark:text-green-400';
        if (value >= 0) return 'text-amber-500';
        return 'text-red-600 dark:text-red-400';
    }

    $: maxDayProfit = Math.max(...analytics.dayOfWeekPnL.map(d => Math.abs(d.profit)), 1);
    $: maxLotCount = Math.max(...analytics.lotDistribution.map(d => d.count), 1);
    $: maxHoldCount = Math.max(...analytics.holdingTimeAnalysis.map(d => d.count), 1);
</script>

<div class="space-y-6">
    <!-- Risk-Adjusted Metrics -->
    <div class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 card-hover">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Risk-Adjusted Metrics
        </h3>
        <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Sharpe Ratio</div>
                <div class="text-2xl font-bold {getRatioColor(analytics.sharpeRatio)}">
                    {formatRatio(analytics.sharpeRatio)}
                </div>
                <div class="text-[10px] text-gray-400 mt-1">Risk-adjusted return</div>
            </div>
            <div class="text-center">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Sortino Ratio</div>
                <div class="text-2xl font-bold {getRatioColor(analytics.sortinoRatio)}">
                    {formatRatio(analytics.sortinoRatio)}
                </div>
                <div class="text-[10px] text-gray-400 mt-1">Downside risk only</div>
            </div>
            <div class="text-center">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Calmar Ratio</div>
                <div class="text-2xl font-bold {getRatioColor(analytics.calmarRatio)}">
                    {formatRatio(analytics.calmarRatio)}
                </div>
                <div class="text-[10px] text-gray-400 mt-1">Return / Max DD</div>
            </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg text-center">
                <div class="text-xs text-gray-500 dark:text-gray-400">Avg Daily Return</div>
                <div class="text-sm font-bold {analytics.avgDailyReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                    {analytics.avgDailyReturn >= 0 ? '+' : ''}{analytics.avgDailyReturn.toFixed(3)}%
                </div>
            </div>
            <div class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg text-center">
                <div class="text-xs text-gray-500 dark:text-gray-400">Daily Volatility</div>
                <div class="text-sm font-bold text-gray-900 dark:text-white">
                    {analytics.dailyVolatility.toFixed(3)}%
                </div>
            </div>
        </div>
    </div>

    <!-- Day of Week Performance -->
    {#if analytics.dayOfWeekPnL.length > 0}
        <div class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 card-hover">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance by Day
            </h3>
            <div class="space-y-2">
                {#each analytics.dayOfWeekPnL as day}
                    {@const barWidth = (Math.abs(day.profit) / maxDayProfit) * 100}
                    <div class="flex items-center gap-3">
                        <div class="w-10 text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">{day.day}</div>
                        <div class="flex-1 h-6 bg-gray-100 dark:bg-dark-bg/50 rounded overflow-hidden">
                            <div
                                class="h-full rounded transition-all duration-500 {day.profit >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}"
                                style="width: {Math.max(barWidth, 2)}%"
                            ></div>
                        </div>
                        <div class="w-20 text-right text-xs font-mono font-bold {day.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                            {day.profit >= 0 ? '+' : ''}${day.profit.toFixed(2)}
                        </div>
                        <div class="w-14 text-right text-[10px] text-gray-400">
                            {day.winRate.toFixed(0)}% ({day.trades})
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Lot Size Distribution & Holding Time -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {#if analytics.lotDistribution.length > 0}
            <div class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 card-hover">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Lot Size Distribution
                </h3>
                <div class="space-y-2">
                    {#each analytics.lotDistribution as lot}
                        {@const barWidth = (lot.count / maxLotCount) * 100}
                        <div class="flex items-center gap-2">
                            <div class="w-20 text-xs text-gray-600 dark:text-gray-400 shrink-0">{lot.range}</div>
                            <div class="flex-1 h-4 bg-gray-100 dark:bg-dark-bg/50 rounded overflow-hidden">
                                <div class="h-full rounded bg-amber-500/40 transition-all" style="width: {barWidth}%"></div>
                            </div>
                            <div class="w-8 text-right text-xs font-bold text-gray-700 dark:text-gray-300">{lot.count}</div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if analytics.holdingTimeAnalysis.length > 0}
            <div class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 card-hover">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Holding Time Analysis
                </h3>
                <div class="space-y-2">
                    {#each analytics.holdingTimeAnalysis as ht}
                        {@const barWidth = (ht.count / maxHoldCount) * 100}
                        <div class="flex items-center gap-2">
                            <div class="w-16 text-xs text-gray-600 dark:text-gray-400 shrink-0">{ht.range}</div>
                            <div class="flex-1 h-4 bg-gray-100 dark:bg-dark-bg/50 rounded overflow-hidden">
                                <div class="h-full rounded bg-purple-500/40 transition-all" style="width: {barWidth}%"></div>
                            </div>
                            <div class="w-16 text-right text-[10px] font-mono {ht.avgProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                {ht.avgProfit >= 0 ? '+' : ''}${ht.avgProfit.toFixed(1)}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>
