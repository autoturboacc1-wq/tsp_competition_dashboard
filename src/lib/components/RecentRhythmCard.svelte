<script lang="ts">
    type DailyHistoryItem = {
        date: string;
        profit: number;
        totalTrades?: number;
    };

    type TradeItem = {
        symbol: string;
        profit: number;
        closeTime: string;
    };

    type SymbolSummary = {
        symbol: string;
        count: number;
        profit: number;
        winRate: number;
    };

    export let dailyHistory: DailyHistoryItem[] = [];
    export let history: TradeItem[] = [];

    function formatSigned(value: number, digits = 2): string {
        return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
    }

    function formatLastTrade(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'No trades yet';

        return new Intl.DateTimeFormat('th-TH', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function formatDayLabel(value: string): string {
        const date = new Date(`${value}T12:00:00`);
        if (Number.isNaN(date.getTime())) return value;

        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short'
        }).format(date);
    }

    $: recentDays = dailyHistory.slice(-7).map((day) => ({
        ...day,
        label: formatDayLabel(day.date)
    }));

    $: maxAbsRecentProfit = Math.max(
        ...recentDays.map((day) => Math.abs(Number(day.profit) || 0)),
        1
    );

    $: netRecentProfit = recentDays.reduce(
        (sum, day) => sum + (Number(day.profit) || 0),
        0
    );

    $: greenDays = recentDays.filter((day) => Number(day.profit) > 0).length;

    $: avgTradesPerDay = recentDays.length
        ? recentDays.reduce((sum, day) => sum + (day.totalTrades || 0), 0) / recentDays.length
        : 0;

    $: latestTrade = history[0] ?? null;

    $: topSymbols = Array.from(
        history.reduce((map, trade) => {
            const key = trade.symbol || 'Unknown';
            const entry = map.get(key) ?? {
                symbol: key,
                count: 0,
                profit: 0,
                wins: 0
            };

            entry.count += 1;
            entry.profit += Number(trade.profit) || 0;
            if (Number(trade.profit) > 0) entry.wins += 1;

            map.set(key, entry);
            return map;
        }, new Map<string, { symbol: string; count: number; profit: number; wins: number }>())
            .values()
    )
        .map((symbol): SymbolSummary => ({
            symbol: symbol.symbol,
            count: symbol.count,
            profit: symbol.profit,
            winRate: symbol.count > 0 ? (symbol.wins / symbol.count) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count || Math.abs(b.profit) - Math.abs(a.profit))
        .slice(0, 3);
</script>

<div class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 card-hover">
    <div class="flex items-start justify-between gap-3">
        <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500">
                Recent Rhythm
            </p>
            <h3 class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                Trading Footprint
            </h3>
            <p class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                Last 7 trading days plus the symbols doing most of the work.
            </p>
        </div>

        <div class="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            Live Form
        </div>
    </div>

    <div class="mt-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-dark-border dark:bg-dark-bg/40">
        <div class="flex items-end justify-between gap-3">
            <div>
                <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                    7D Net P/L
                </p>
                <p class:text-green-600={netRecentProfit >= 0} class:text-red-500={netRecentProfit < 0} class="mt-1 text-2xl font-semibold tabular-nums">
                    {formatSigned(netRecentProfit)}
                </p>
            </div>

            <div class="text-right">
                <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                    Green Days
                </p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {greenDays}/{recentDays.length || 0}
                </p>
            </div>
        </div>

        <div class="mt-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>{avgTradesPerDay.toFixed(1)} avg trades/day</span>
            <span>{recentDays.length} active days</span>
        </div>

        {#if recentDays.length > 0}
            <div class="mt-4 grid grid-cols-7 gap-2">
                {#each recentDays as day}
                    {@const intensity = Math.max((Math.abs(Number(day.profit) || 0) / maxAbsRecentProfit) * 100, 14)}
                    <div class="rounded-xl border px-2 py-2.5 text-center transition-colors
                        {Number(day.profit) > 0
                            ? 'border-green-200 bg-green-50/80 dark:border-green-500/20 dark:bg-green-500/10'
                            : Number(day.profit) < 0
                                ? 'border-red-200 bg-red-50/80 dark:border-red-500/20 dark:bg-red-500/10'
                                : 'border-gray-200 bg-white/80 dark:border-dark-border dark:bg-dark-bg/30'}"
                    >
                        <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                            {day.label}
                        </div>

                        <div class="mt-2 flex h-10 items-end">
                            <div
                                class="w-full rounded-md transition-all
                                    {Number(day.profit) > 0
                                        ? 'bg-green-500/55'
                                        : Number(day.profit) < 0
                                            ? 'bg-red-500/55'
                                            : 'bg-gray-300/70 dark:bg-gray-600/60'}"
                                style={`height: ${intensity}%`}
                            ></div>
                        </div>

                        <div class="mt-2 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                            {day.totalTrades || 0}T
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="mt-4 rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-dark-border dark:text-gray-500">
                Recent daily data is not available yet.
            </div>
        {/if}
    </div>

    <div class="mt-4">
        <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500">
                Top Symbols
            </p>
            <p class="text-[11px] text-gray-400 dark:text-gray-500">
                {latestTrade ? `Last trade ${formatLastTrade(latestTrade.closeTime)}` : 'No recent close'}
            </p>
        </div>

        {#if topSymbols.length > 0}
            <div class="mt-3 space-y-2">
                {#each topSymbols as symbol}
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-dark-bg/40">
                        <div class="min-w-0">
                            <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {symbol.symbol}
                            </p>
                            <p class="text-[11px] text-gray-500 dark:text-gray-400">
                                {symbol.count} trades
                            </p>
                        </div>

                        <div class="text-right">
                            <p class:text-green-600={symbol.profit >= 0} class:text-red-500={symbol.profit < 0} class="text-xs font-mono font-semibold tabular-nums">
                                {formatSigned(symbol.profit)}
                            </p>
                            <p class="text-[11px] text-gray-400 dark:text-gray-500">
                                {symbol.winRate.toFixed(0)}% win
                            </p>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="mt-3 rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-dark-border dark:text-gray-500">
                Symbol breakdown will appear once trades are available.
            </div>
        {/if}
    </div>
</div>
