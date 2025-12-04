<script lang="ts">
    import { page } from "$app/stores";
    import type { PageData } from "./$types";

    export let data: PageData;

    $: id = $page.params.id;
    $: trader = data.trader;
    // Rank calculation would ideally come from server or context,
    // for now we might lose the global rank context in this view unless passed.
    // Let's assume for now we just show the data.
    // To get rank, we might need to fetch the leaderboard or pass it.
    // For this specific UI, it calculates rank from the imported mock list.
    // We'll leave rank as 0 or pass it from server if possible.
    $: rank = data.rank;

    function formatMoney(amount: number) {
        return amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    function getRankIcon(rank: number): string {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return `#${rank}`;
    }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">
        <!-- Back Button -->
        <a
            href="/leaderboard"
            class="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 mb-6"
        >
            &larr; Back to Leaderboard
        </a>

        {#if !trader}
            <div class="text-center py-12">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                    Trader not found
                </h2>
                <p class="text-gray-500 dark:text-gray-400 mt-2">
                    The participant with ID {id} does not exist.
                </p>
            </div>
        {:else}
            <!-- Header -->
            <div
                class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div class="flex items-center gap-4">
                    <div
                        class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-3xl"
                    >
                        {getRankIcon(rank)}
                    </div>
                    <div>
                        <h1
                            class="text-3xl font-bold text-gray-900 dark:text-white"
                        >
                            {trader.nickname}
                        </h1>
                        <p class="text-gray-500 dark:text-gray-300">
                            Rank {rank} • {trader.points.toLocaleString()} Points
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <p
                        class="text-sm text-gray-500 dark:text-gray-300 uppercase tracking-wide"
                    >
                        Total Profit
                    </p>
                    <p
                        class="text-3xl font-mono font-bold {trader.profit >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'}"
                    >
                        {trader.profit >= 0 ? "+" : ""}{formatMoney(
                            trader.profit,
                        )}
                    </p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- 1. Equity Curve (Top Left on Desktop, 1st on Mobile) -->
                <div class="lg:col-span-2">
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6"
                    >
                        <h3
                            class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                        >
                            Equity Growth
                        </h3>
                        <div
                            class="h-64 bg-gray-50 dark:bg-dark-bg/50 rounded-lg flex items-end justify-between px-2 pb-2 overflow-hidden relative"
                        >
                            <!-- Simple SVG Line Chart -->
                            <svg
                                class="w-full h-full absolute inset-0"
                                preserveAspectRatio="none"
                            >
                                <polyline
                                    fill="none"
                                    stroke="#2563eb"
                                    stroke-width="2"
                                    points={trader.equityCurve
                                        .map((val, i) => {
                                            const max = Math.max(
                                                ...trader.equityCurve,
                                            );
                                            const min = Math.min(
                                                ...trader.equityCurve,
                                            );
                                            const range = max - min || 1;
                                            const x =
                                                (i /
                                                    (trader.equityCurve.length -
                                                        1)) *
                                                100;
                                            const y =
                                                100 -
                                                ((val - min) / range) * 100;
                                            return `${x},${y}`;
                                        })
                                        .join(" ")}
                                    vector-effect="non-scaling-stroke"
                                />
                            </svg>
                            <!-- Gradient fill below -->
                            <svg
                                class="w-full h-full absolute inset-0 opacity-10"
                                preserveAspectRatio="none"
                            >
                                <polygon
                                    fill="#2563eb"
                                    points={`0,100 ${trader.equityCurve
                                        .map((val, i) => {
                                            const max = Math.max(
                                                ...trader.equityCurve,
                                            );
                                            const min = Math.min(
                                                ...trader.equityCurve,
                                            );
                                            const range = max - min || 1;
                                            const x =
                                                (i /
                                                    (trader.equityCurve.length -
                                                        1)) *
                                                100;
                                            const y =
                                                100 -
                                                ((val - min) / range) * 100;
                                            return `${x},${y}`;
                                        })
                                        .join(" ")} 100,100`}
                                    vector-effect="non-scaling-stroke"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- 2. Sidebar Stats (Right on Desktop, 2nd on Mobile) -->
                <div class="lg:col-span-1 lg:row-span-2 space-y-6 h-fit">
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6"
                    >
                        <h3
                            class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                        >
                            Performance Stats
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between text-sm mb-1">
                                    <span
                                        class="text-gray-500 dark:text-gray-300"
                                        >Win Rate</span
                                    >
                                    <span
                                        class="font-medium text-gray-900 dark:text-white"
                                        >{Number(trader.stats.winRate).toFixed(
                                            2,
                                        )}%</span
                                    >
                                </div>
                                <div
                                    class="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2"
                                >
                                    <div
                                        class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                                        style="width: {trader.stats.winRate}%"
                                    ></div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4 pt-2">
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Profit Factor
                                    </div>
                                    <div
                                        class="text-xl font-bold text-gray-900 dark:text-white"
                                    >
                                        {trader.stats.profitFactor}
                                    </div>
                                </div>
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Max DD
                                    </div>
                                    <div
                                        class="text-xl font-bold text-red-600 dark:text-red-400"
                                    >
                                        {trader.stats.maxDrawdown}%
                                    </div>
                                </div>
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Trades
                                    </div>
                                    <div
                                        class="text-xl font-bold text-gray-900 dark:text-white"
                                    >
                                        {trader.stats.totalTrades}
                                    </div>
                                </div>
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Avg Win
                                    </div>
                                    <div
                                        class="text-xl font-bold text-green-600 dark:text-green-400"
                                    >
                                        ${trader.stats.avgWin}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6"
                    >
                        <h3
                            class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                        >
                            Trading Style: {trader.stats.tradingStyle}
                        </h3>
                        <div class="space-y-3">
                            <div
                                class="flex items-center justify-between text-sm"
                            >
                                <span class="text-gray-600 dark:text-gray-300"
                                    >Favorite Pair</span
                                >
                                <span
                                    class="font-medium text-gray-900 dark:text-white"
                                    >{trader.stats.favoritePair}</span
                                >
                            </div>
                            <div
                                class="flex items-center justify-between text-sm"
                            >
                                <span class="text-gray-600 dark:text-gray-300"
                                    >Avg Holding Time</span
                                >
                                <span
                                    class="font-medium text-gray-900 dark:text-white"
                                    >{trader.stats.avgHoldingTime}</span
                                >
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Trade History (Bottom Left on Desktop, 3rd on Mobile) -->
                <div class="lg:col-span-2">
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden"
                    >
                        <div
                            class="px-6 py-4 border-b border-gray-100 dark:border-dark-border"
                        >
                            <h3
                                class="text-lg font-semibold text-gray-900 dark:text-white"
                            >
                                Recent History
                            </h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table
                                class="w-full text-sm text-left text-gray-500 dark:text-gray-400"
                            >
                                <thead
                                    class="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-dark-surface"
                                >
                                    <tr>
                                        <th class="px-6 py-3">Symbol</th>
                                        <th class="px-6 py-3">Type</th>
                                        <th class="px-6 py-3 text-right">Lot</th
                                        >
                                        <th class="px-6 py-3 text-right"
                                            >Profit</th
                                        >
                                        <th class="px-6 py-3 text-right"
                                            >Time</th
                                        >
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each trader.history as trade}
                                        <tr
                                            class="border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border/30"
                                        >
                                            <td
                                                class="px-6 py-4 font-medium text-gray-900 dark:text-white"
                                                >{trade.symbol}</td
                                            >
                                            <td class="px-6 py-4">
                                                <span
                                                    class="px-2 py-1 rounded text-xs font-bold {trade.type ===
                                                    'BUY'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}"
                                                >
                                                    {trade.type}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 text-right"
                                                >{trade.lot.toFixed(2)}</td
                                            >
                                            <td
                                                class="px-6 py-4 text-right font-mono {trade.profit >=
                                                0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'}"
                                            >
                                                {trade.profit >= 0
                                                    ? "+"
                                                    : ""}{trade.profit.toFixed(
                                                    2,
                                                )}
                                            </td>
                                            <td
                                                class="px-6 py-4 text-right text-xs text-gray-400 dark:text-gray-500"
                                            >
                                                {new Date(
                                                    trade.closeTime,
                                                ).toLocaleTimeString("th-TH", {
                                                    timeZone: "Asia/Bangkok",
                                                })}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
