<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
    import { createChart, ColorType } from "lightweight-charts";
    import type { PageData } from "./$types";

    export let data: PageData;

    $: id = $page.params.id;
    let trader = data.trader;
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

    // Chart Interaction
    let chartContainer: HTMLDivElement;
    let hoverIndex: number | null = null;
    let hoverX = 0;
    let hoverY = 0;

    function handleMouseMove(e: MouseEvent) {
        if (!chartContainer || !trader.equityCurve.length) return;
        const rect = chartContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        // Find closest data point
        const index = Math.min(
            Math.max(
                Math.round((x / width) * (trader.equityCurve.length - 1)),
                0,
            ),
            trader.equityCurve.length - 1,
        );

        hoverIndex = index;

        // Calculate Y position for the tooltip
        const max = Math.max(...trader.equityCurve);
        const min = Math.min(...trader.equityCurve);
        const range = max - min || 1;
        const val = trader.equityCurve[index];
        const normalizedY = 1 - (val - min) / range;

        hoverX = (index / (trader.equityCurve.length - 1)) * width;
        hoverY = normalizedY * rect.height;
    }

    function handleMouseLeave() {
        hoverIndex = null;
    }
    // Chart Modal State
    let showChartModal = false;
    let selectedTrade: any = null;
    let chartContainerRef: HTMLDivElement;
    let chart: any;
    let candlestickSeries: any;

    async function openChart(trade: any) {
        selectedTrade = trade;
        showChartModal = true;

        // Wait for modal to render
        setTimeout(async () => {
            if (!chartContainerRef) return;

            // Calculate time range (e.g., +/- 4 hours around open/close)
            const openTime = new Date(trade.openTime).getTime();
            const closeTime = new Date(trade.closeTime).getTime();
            const buffer = 4 * 60 * 60 * 1000; // 4 hours

            const from = new Date(openTime - buffer).toISOString();
            const to = new Date(closeTime + buffer).toISOString();

            // Fetch candles
            const res = await fetch(
                `/api/candles?symbol=${trade.symbol}&from=${from}&to=${to}`,
            );
            const candles = await res.json();

            if (candles.error || !candles.length) {
                console.error("No candles found");
                return;
            }

            // Initialize Chart
            if (chart) chart.remove();

            chart = createChart(chartContainerRef, {
                layout: {
                    background: { type: ColorType.Solid, color: "#111827" },
                    textColor: "#D1D5DB",
                },
                grid: {
                    vertLines: { color: "#374151" },
                    horzLines: { color: "#374151" },
                },
                width: chartContainerRef.clientWidth,
                height: 400,
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            candlestickSeries = chart.addCandlestickSeries({
                upColor: "#10B981",
                downColor: "#EF4444",
                borderVisible: false,
                wickUpColor: "#10B981",
                wickDownColor: "#EF4444",
            });

            // Format data for lightweight-charts
            const chartData = candles.map((c: any) => ({
                time: new Date(c.time).getTime() / 1000,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }));

            candlestickSeries.setData(chartData);

            // Add Entry Line
            const entryLine = chart.addLineSeries({
                color: "#10B981", // Green
                lineWidth: 2,
                lineStyle: 2, // Dashed
                title: "Entry",
            });
            entryLine.setData([
                { time: chartData[0].time, value: trade.openPrice },
                {
                    time: chartData[chartData.length - 1].time,
                    value: trade.openPrice,
                },
            ]);

            // Add SL Line
            if (trade.sl > 0) {
                const slLine = chart.addLineSeries({
                    color: "#EF4444", // Red
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    title: "SL",
                });
                slLine.setData([
                    { time: chartData[0].time, value: trade.sl },
                    {
                        time: chartData[chartData.length - 1].time,
                        value: trade.sl,
                    },
                ]);
            }

            // Add TP Line
            if (trade.tp > 0) {
                const tpLine = chart.addLineSeries({
                    color: "#3B82F6", // Blue
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    title: "TP",
                });
                tpLine.setData([
                    { time: chartData[0].time, value: trade.tp },
                    {
                        time: chartData[chartData.length - 1].time,
                        value: trade.tp,
                    },
                ]);
            }

            chart.timeScale().fitContent();
        }, 100);
    }

    function closeChartModal() {
        showChartModal = false;
        selectedTrade = null;
        if (chart) {
            chart.remove();
            chart = null;
        }
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
                            bind:this={chartContainer}
                            on:mousemove={handleMouseMove}
                            on:mouseleave={handleMouseLeave}
                            role="application"
                            class="h-64 bg-gray-50 dark:bg-dark-bg/50 rounded-lg flex items-end justify-between px-2 pb-2 overflow-hidden relative cursor-crosshair group"
                        >
                            <!-- Enhanced SVG Chart -->
                            <svg
                                class="w-full h-full absolute inset-0"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient
                                        id="lineGradient"
                                        x1="0"
                                        y1="0"
                                        x2="1"
                                        y2="0"
                                    >
                                        <stop
                                            offset="0%"
                                            stop-color="#3b82f6"
                                        />
                                        <stop
                                            offset="100%"
                                            stop-color="#8b5cf6"
                                        />
                                    </linearGradient>
                                    <linearGradient
                                        id="areaGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stop-color="#3b82f6"
                                            stop-opacity="0.2"
                                        />
                                        <stop
                                            offset="100%"
                                            stop-color="#3b82f6"
                                            stop-opacity="0"
                                        />
                                    </linearGradient>
                                    <filter
                                        id="glow"
                                        x="-20%"
                                        y="-20%"
                                        width="140%"
                                        height="140%"
                                    >
                                        <feGaussianBlur
                                            stdDeviation="2"
                                            result="coloredBlur"
                                        />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>

                                <!-- Area Fill -->
                                <polygon
                                    fill="url(#areaGradient)"
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
                                                ((val - min) / range) * 80 -
                                                10; // Add padding
                                            return `${x},${y}`;
                                        })
                                        .join(" ")} 100,100`}
                                />

                                <!-- Line Path -->
                                <polyline
                                    fill="none"
                                    stroke="url(#lineGradient)"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    filter="url(#glow)"
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
                                                ((val - min) / range) * 80 -
                                                10; // Add padding
                                            return `${x},${y}`;
                                        })
                                        .join(" ")}
                                    vector-effect="non-scaling-stroke"
                                />
                            </svg>

                            <!-- Interactive Elements -->
                            {#if hoverIndex !== null}
                                <!-- Vertical Line -->
                                <div
                                    class="absolute top-0 bottom-0 w-px bg-gray-400/50 border-r border-dashed border-gray-400 dark:border-gray-500 pointer-events-none"
                                    style="left: {hoverX}px;"
                                ></div>

                                <!-- Tooltip Point -->
                                <div
                                    class="absolute w-3 h-3 bg-white dark:bg-dark-surface border-2 border-blue-500 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                                    style="left: {hoverX}px; top: {hoverY}px;"
                                ></div>

                                <!-- Tooltip Box -->
                                <div
                                    class="absolute bg-gray-900/90 text-white text-xs rounded-lg py-1 px-2 shadow-xl transform -translate-x-1/2 pointer-events-none z-20 whitespace-nowrap backdrop-blur-sm"
                                    style="left: {hoverX}px; top: {Math.max(
                                        0,
                                        hoverY - 40,
                                    )}px;"
                                >
                                    <div class="font-bold">
                                        ${formatMoney(
                                            trader.equityCurve[hoverIndex],
                                        )}
                                    </div>
                                    <div class="text-gray-400 text-[10px]">
                                        Trade #{hoverIndex + 1}
                                    </div>
                                </div>
                            {/if}
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

                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <div
                                        class="flex justify-between text-xs mb-1"
                                    >
                                        <span
                                            class="text-gray-500 dark:text-gray-300"
                                            >Long Win Rate</span
                                        >
                                        <span
                                            class="font-medium text-green-600 dark:text-green-400"
                                            >{Number(
                                                trader.stats.winRateBuy,
                                            ).toFixed(1)}%</span
                                        >
                                    </div>
                                    <div
                                        class="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1.5"
                                    >
                                        <div
                                            class="bg-green-500 h-1.5 rounded-full"
                                            style="width: {trader.stats
                                                .winRateBuy}%"
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div
                                        class="flex justify-between text-xs mb-1"
                                    >
                                        <span
                                            class="text-gray-500 dark:text-gray-300"
                                            >Short Win Rate</span
                                        >
                                        <span
                                            class="font-medium text-red-600 dark:text-red-400"
                                            >{Number(
                                                trader.stats.winRateSell,
                                            ).toFixed(1)}%</span
                                        >
                                    </div>
                                    <div
                                        class="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1.5"
                                    >
                                        <div
                                            class="bg-red-500 h-1.5 rounded-full"
                                            style="width: {trader.stats
                                                .winRateSell}%"
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Max Consec. Wins
                                    </div>
                                    <div
                                        class="text-xl font-bold text-green-600 dark:text-green-400"
                                    >
                                        {trader.stats.maxConsecutiveWins}
                                    </div>
                                </div>
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Max Consec. Losses
                                    </div>
                                    <div
                                        class="text-xl font-bold text-red-600 dark:text-red-400"
                                    >
                                        {trader.stats.maxConsecutiveLosses}
                                    </div>
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
                                        RR Ratio
                                    </div>
                                    <div
                                        class="text-xl font-bold {trader.stats
                                            .rrRatio >= 1
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'}"
                                    >
                                        {trader.stats.rrRatio}
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
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Avg Loss
                                    </div>
                                    <div
                                        class="text-xl font-bold text-red-600 dark:text-red-400"
                                    >
                                        ${trader.stats.avgLoss}
                                    </div>
                                </div>
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Best Trade
                                    </div>
                                    <div
                                        class="text-xl font-bold text-green-600 dark:text-green-400"
                                    >
                                        +${trader.stats.bestTrade}
                                    </div>
                                </div>
                                <div
                                    class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg"
                                >
                                    <div
                                        class="text-xs text-gray-500 dark:text-gray-300"
                                    >
                                        Worst Trade
                                    </div>
                                    <div
                                        class="text-xl font-bold {trader.stats
                                            .worstTrade >= 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'}"
                                    >
                                        {trader.stats.worstTrade >= 0
                                            ? "+"
                                            : ""}${trader.stats.worstTrade}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Session Performance -->
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 mb-6"
                    >
                        <h3
                            class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                        >
                            Session Performance
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <!-- Asian Session -->
                            <div
                                class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg border border-gray-100 dark:border-dark-border"
                            >
                                <div class="flex flex-col mb-2 h-8 justify-end">
                                    <span
                                        class="text-xs font-semibold text-gray-500 dark:text-gray-400"
                                        >ASIA</span
                                    >
                                </div>
                                <div class="flex flex-col mb-1">
                                    <span
                                        class="text-sm text-gray-600 dark:text-gray-300"
                                        >Win Rate</span
                                    >
                                    <span
                                        class="font-bold text-gray-900 dark:text-white"
                                        >{Number(
                                            trader.stats.sessionAsianWinRate,
                                        ).toFixed(1)}%</span
                                    >
                                </div>
                                <div
                                    class="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1 mb-3"
                                >
                                    <div
                                        class="bg-blue-500 h-1 rounded-full"
                                        style="width: {trader.stats
                                            .sessionAsianWinRate}%"
                                    ></div>
                                </div>
                                <div class="flex justify-end items-center">
                                    <span
                                        class="font-bold {trader.stats
                                            .sessionAsianProfit >= 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'}"
                                    >
                                        {trader.stats.sessionAsianProfit >= 0
                                            ? "+"
                                            : ""}{Number(
                                            trader.stats.sessionAsianProfit,
                                        ).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <!-- London Session -->
                            <div
                                class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg border border-gray-100 dark:border-dark-border"
                            >
                                <div class="flex flex-col mb-2 h-8 justify-end">
                                    <span
                                        class="text-xs font-semibold text-gray-500 dark:text-gray-400"
                                        >LONDON</span
                                    >
                                </div>
                                <div class="flex flex-col mb-1">
                                    <span
                                        class="text-sm text-gray-600 dark:text-gray-300"
                                        >Win Rate</span
                                    >
                                    <span
                                        class="font-bold text-gray-900 dark:text-white"
                                        >{Number(
                                            trader.stats.sessionLondonWinRate,
                                        ).toFixed(1)}%</span
                                    >
                                </div>
                                <div
                                    class="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1 mb-3"
                                >
                                    <div
                                        class="bg-purple-500 h-1 rounded-full"
                                        style="width: {trader.stats
                                            .sessionLondonWinRate}%"
                                    ></div>
                                </div>
                                <div class="flex justify-end items-center">
                                    <span
                                        class="font-bold {trader.stats
                                            .sessionLondonProfit >= 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'}"
                                    >
                                        {trader.stats.sessionLondonProfit >= 0
                                            ? "+"
                                            : ""}{Number(
                                            trader.stats.sessionLondonProfit,
                                        ).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <!-- New York Session -->
                            <div
                                class="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-lg border border-gray-100 dark:border-dark-border"
                            >
                                <div class="flex flex-col mb-2 h-8 justify-end">
                                    <span
                                        class="text-xs font-semibold text-gray-500 dark:text-gray-400"
                                        >NEW YORK</span
                                    >
                                </div>
                                <div class="flex flex-col mb-1">
                                    <span
                                        class="text-sm text-gray-600 dark:text-gray-300"
                                        >Win Rate</span
                                    >
                                    <span
                                        class="font-bold text-gray-900 dark:text-white"
                                        >{Number(
                                            trader.stats.sessionNewYorkWinRate,
                                        ).toFixed(1)}%</span
                                    >
                                </div>
                                <div
                                    class="w-full bg-gray-200 dark:bg-dark-border rounded-full h-1 mb-3"
                                >
                                    <div
                                        class="bg-orange-500 h-1 rounded-full"
                                        style="width: {trader.stats
                                            .sessionNewYorkWinRate}%"
                                    ></div>
                                </div>
                                <div class="flex justify-end items-center">
                                    <span
                                        class="font-bold {trader.stats
                                            .sessionNewYorkProfit >= 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'}"
                                    >
                                        {trader.stats.sessionNewYorkProfit >= 0
                                            ? "+"
                                            : ""}{Number(
                                            trader.stats.sessionNewYorkProfit,
                                        ).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Consistency Heatmap -->
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 mb-6"
                    >
                        <h3
                            class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                        >
                            Consistency Heatmap
                        </h3>
                        <div class="flex flex-wrap gap-1">
                            {#each trader.dailyHistory || [] as day}
                                <div
                                    class="w-4 h-4 rounded-sm cursor-pointer transition-colors duration-200 relative group"
                                    class:bg-gray-200={day.profit === 0}
                                    class:dark:bg-dark-border={day.profit === 0}
                                    class:bg-green-200={day.profit > 0 &&
                                        day.profit <= 100}
                                    class:bg-green-400={day.profit > 100 &&
                                        day.profit <= 500}
                                    class:bg-green-600={day.profit > 500}
                                    class:bg-red-200={day.profit < 0 &&
                                        day.profit >= -100}
                                    class:bg-red-400={day.profit < -100 &&
                                        day.profit >= -500}
                                    class:bg-red-600={day.profit < -500}
                                >
                                    <!-- Tooltip -->
                                    <div
                                        class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none"
                                    >
                                        <div class="font-semibold">
                                            {day.date}
                                        </div>
                                        <div
                                            class={day.profit >= 0
                                                ? "text-green-400"
                                                : "text-red-400"}
                                        >
                                            {day.profit >= 0 ? "+" : ""}{Number(
                                                day.profit,
                                            ).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                        <div
                            class="flex items-center gap-2 mt-4 text-xs text-gray-500"
                        >
                            <span>Less</span>
                            <div class="w-3 h-3 bg-red-600 rounded-sm"></div>
                            <div class="w-3 h-3 bg-red-400 rounded-sm"></div>
                            <div class="w-3 h-3 bg-red-200 rounded-sm"></div>
                            <div
                                class="w-3 h-3 bg-gray-200 dark:bg-dark-border rounded-sm"
                            ></div>
                            <div class="w-3 h-3 bg-green-200 rounded-sm"></div>
                            <div class="w-3 h-3 bg-green-400 rounded-sm"></div>
                            <div class="w-3 h-3 bg-green-600 rounded-sm"></div>
                            <span>More</span>
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
                            <div
                                class="flex items-center justify-between text-sm"
                            >
                                <span class="text-gray-600 dark:text-gray-300"
                                    >Avg Hold (Win)</span
                                >
                                <span
                                    class="font-medium text-green-600 dark:text-green-400"
                                    >{trader.stats.avgHoldingTimeWin}</span
                                >
                            </div>
                            <div
                                class="flex items-center justify-between text-sm"
                            >
                                <span class="text-gray-600 dark:text-gray-300"
                                    >Avg Hold (Loss)</span
                                >
                                <span
                                    class="font-medium text-red-600 dark:text-red-400"
                                    >{trader.stats.avgHoldingTimeLoss}</span
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
                                            class="border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border/30 cursor-pointer transition-colors"
                                            on:click={() => openChart(trade)}
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

<!-- Chart Modal -->
{#if showChartModal}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
        <div
            class="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 dark:border-dark-border"
        >
            <!-- Header -->
            <div
                class="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center"
            >
                <div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedTrade?.symbol} - {selectedTrade?.type}
                    </h3>
                    <p class="text-sm text-gray-500">
                        Open: {selectedTrade?.openPrice} | Close: {selectedTrade?.closePrice}
                        | Profit: ${selectedTrade?.profit}
                    </p>
                </div>
                <button
                    on:click={closeChartModal}
                    class="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                >
                    <svg
                        class="w-6 h-6 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Chart Container -->
            <div class="p-4 bg-gray-900">
                <div
                    bind:this={chartContainerRef}
                    class="w-full h-[400px]"
                ></div>
            </div>

            <!-- Legend -->
            <div class="p-4 bg-gray-50 dark:bg-dark-bg/50 flex gap-4 text-sm">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    <span class="text-gray-600 dark:text-gray-300"
                        >Entry: {selectedTrade?.openPrice}</span
                    >
                </div>
                {#if selectedTrade?.sl}
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                        <span class="text-gray-600 dark:text-gray-300"
                            >SL: {selectedTrade?.sl}</span
                        >
                    </div>
                {/if}
                {#if selectedTrade?.tp}
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span class="text-gray-600 dark:text-gray-300"
                            >TP: {selectedTrade?.tp}</span
                        >
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
