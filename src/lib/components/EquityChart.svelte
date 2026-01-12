<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { createChart, ColorType, LineStyle } from "lightweight-charts";

    // Props
    export let equitySnapshots: Array<{
        time: number;
        balance: number;
        equity: number;
        floatingPL: number;
    }> = [];

    export let equityCurve: number[] = []; // Fallback daily data

    const dispatch = createEventDispatcher();

    // State
    let chartContainer: HTMLDivElement;
    let chart: any;
    let equitySeries: any;
    let balanceSeries: any;
    let floatingZoneSeries: any;

    let currentTimeframe = "1M";
    let isLoading = false;

    // Tooltip state
    let tooltipVisible = false;
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipData: any = null;

    const timeframes = [
        { label: "1D", days: 1 },
        { label: "1W", days: 7 },
        { label: "1M", days: 30 },
        { label: "3M", days: 90 },
        { label: "6M", days: 180 },
        { label: "1Y", days: 365 },
    ];

    // Process data for selected timeframe
    function getFilteredData(days: number) {
        if (!equitySnapshots || equitySnapshots.length === 0) {
            // Fallback to daily equity curve
            return equityCurve.map((eq, i) => ({
                time:
                    Math.floor(Date.now() / 1000) -
                    (equityCurve.length - i) * 86400,
                equity: eq,
                balance: eq,
                floatingPL: 0,
            }));
        }

        const now = Math.floor(Date.now() / 1000);
        const cutoff = now - days * 86400;

        return equitySnapshots
            .filter((s) => s.time >= cutoff)
            .sort((a, b) => a.time - b.time);
    }

    function initChart() {
        if (!chartContainer || chart) return;

        chart = createChart(chartContainer, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#9CA3AF",
                fontFamily: "'Inter', sans-serif",
            },
            localization: {
                timeFormatter: (timestamp: number) => {
                    const date = new Date(timestamp * 1000);
                    const day = date.getUTCDate().toString().padStart(2, "0");
                    const month = date.toLocaleString("en-US", {
                        month: "short",
                        timeZone: "UTC",
                    });
                    const hours = date
                        .getUTCHours()
                        .toString()
                        .padStart(2, "0");
                    const minutes = date
                        .getUTCMinutes()
                        .toString()
                        .padStart(2, "0");
                    return `${day} ${month} ${hours}:${minutes}`;
                },
            },
            grid: {
                vertLines: {
                    color: "rgba(55, 65, 81, 0.5)",
                    style: LineStyle.Dotted,
                },
                horzLines: {
                    color: "rgba(55, 65, 81, 0.5)",
                    style: LineStyle.Dotted,
                },
            },
            width: chartContainer.clientWidth,
            height: 280,
            rightPriceScale: {
                borderColor: "rgba(55, 65, 81, 0.5)",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: "rgba(55, 65, 81, 0.5)",
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                tickMarkFormatter: (time: number, tickMarkType: number) => {
                    const date = new Date(time * 1000);
                    switch (tickMarkType) {
                        case 0:
                            return date.getUTCFullYear().toString();
                        case 1:
                            return date.toLocaleString("en-US", {
                                month: "short",
                                timeZone: "UTC",
                            });
                        case 2:
                            return date.getUTCDate().toString();
                        case 3: {
                            const h = date
                                .getUTCHours()
                                .toString()
                                .padStart(2, "0");
                            const m = date
                                .getUTCMinutes()
                                .toString()
                                .padStart(2, "0");
                            return `${h}:${m}`;
                        }
                        default:
                            return date.getUTCDate().toString();
                    }
                },
            },
            crosshair: {
                mode: 1, // Magnet
                vertLine: {
                    color: "rgba(59, 130, 246, 0.5)",
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: "#1F2937",
                },
                horzLine: {
                    color: "rgba(59, 130, 246, 0.5)",
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: "#1F2937",
                },
            },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale: { mouseWheel: true, pinch: true },
        });

        // Floating P/L Zone (Area between equity and balance)
        floatingZoneSeries = chart.addAreaSeries({
            lineColor: "transparent",
            topColor: "rgba(16, 185, 129, 0.15)",
            bottomColor: "rgba(239, 68, 68, 0.15)",
            lineWidth: 0,
            crosshairMarkerVisible: false,
        });

        // Balance Line (solid, secondary)
        balanceSeries = chart.addLineSeries({
            color: "#6B7280",
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBorderColor: "#6B7280",
            crosshairMarkerBackgroundColor: "#1F2937",
            title: "Balance",
        });

        // Equity Line (gradient, primary)
        equitySeries = chart.addLineSeries({
            color: "#3B82F6",
            lineWidth: 3,
            lineStyle: LineStyle.Solid,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 5,
            crosshairMarkerBorderColor: "#3B82F6",
            crosshairMarkerBackgroundColor: "#1F2937",
            title: "Equity",
            lastValueVisible: true,
            priceLineVisible: true,
            priceLineColor: "#3B82F6",
            priceLineStyle: LineStyle.Dashed,
        });

        // Subscribe to crosshair move
        chart.subscribeCrosshairMove((param: any) => {
            if (!param || !param.time || !param.point) {
                tooltipVisible = false;
                return;
            }

            const equityData = param.seriesData.get(equitySeries);
            const balanceData = param.seriesData.get(balanceSeries);

            if (equityData && balanceData) {
                tooltipVisible = true;
                tooltipX = param.point.x;
                tooltipY = param.point.y;
                tooltipData = {
                    time: param.time,
                    equity: equityData.value,
                    balance: balanceData.value,
                    floatingPL: equityData.value - balanceData.value,
                };
            }
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            if (chart && chartContainer) {
                chart.applyOptions({ width: chartContainer.clientWidth });
            }
        });
        resizeObserver.observe(chartContainer);

        updateChartData();
    }

    function updateChartData() {
        if (!chart || !equitySeries || !balanceSeries) return;

        const days =
            timeframes.find((t) => t.label === currentTimeframe)?.days || 30;
        const data = getFilteredData(days);

        if (data.length === 0) return;

        // Prepare series data with Thailand offset (UTC+7)
        const THAILAND_OFFSET = 7 * 60 * 60;
        const equityData = data.map((d) => ({
            time: (d.time + THAILAND_OFFSET) as any,
            value: d.equity,
        }));
        const balanceData = data.map((d) => ({
            time: (d.time + THAILAND_OFFSET) as any,
            value: d.balance,
        }));

        equitySeries.setData(equityData);
        balanceSeries.setData(balanceData);

        // Calculate floating zone data - color based on P/L
        const zoneData = data.map((d) => ({
            time: (d.time + THAILAND_OFFSET) as any,
            value: d.equity,
            color:
                d.floatingPL >= 0
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(239, 68, 68, 0.2)",
        }));
        floatingZoneSeries.setData(zoneData);

        chart.timeScale().fitContent();
    }

    function selectTimeframe(tf: string) {
        currentTimeframe = tf;
        updateChartData();
        dispatch("timeframeChange", { timeframe: tf });
    }

    function formatMoney(value: number): string {
        return value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    function formatDate(timestamp: number): string {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC", // Use UTC because timestamp is already offset
        });
    }

    onMount(() => {
        initChart();
    });

    onDestroy(() => {
        if (chart) {
            chart.remove();
            chart = null;
        }
    });

    // Watch for data changes
    $: if (equitySnapshots || equityCurve) {
        updateChartData();
    }
</script>

<div class="equity-chart-container">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Equity Growth
            </h3>
            <!-- Legend -->
            <div class="flex items-center gap-4 text-xs">
                <div class="flex items-center gap-1.5">
                    <span class="w-3 h-0.5 bg-blue-500 rounded"></span>
                    <span class="text-gray-500 dark:text-gray-400">Equity</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-3 h-0.5 bg-gray-500 rounded"></span>
                    <span class="text-gray-500 dark:text-gray-400">Balance</span
                    >
                </div>
            </div>
        </div>

        <!-- Timeframe Selector -->
        <div class="flex gap-1 bg-gray-100 dark:bg-dark-bg/50 rounded-lg p-1">
            {#each timeframes as tf}
                <button
                    class="px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
                        {currentTimeframe === tf.label
                        ? 'bg-white dark:bg-dark-surface text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
                    on:click={() => selectTimeframe(tf.label)}
                >
                    {tf.label}
                </button>
            {/each}
        </div>
    </div>

    <!-- Chart Container -->
    <div class="relative">
        <div
            bind:this={chartContainer}
            class="w-full h-72 bg-gray-50 dark:bg-dark-bg/30 rounded-lg overflow-hidden"
        ></div>

        <!-- Custom Tooltip -->
        {#if tooltipVisible && tooltipData}
            <div
                class="absolute pointer-events-none z-50 bg-gray-900/95 dark:bg-gray-800/95
                       text-white text-xs rounded-xl py-3 px-4 shadow-xl backdrop-blur-sm
                       border border-gray-700/50 min-w-[180px] tooltip-enter transition-all duration-150"
                style="left: {Math.min(
                    tooltipX + 15,
                    chartContainer?.clientWidth - 200 || 0,
                )}px; top: {Math.max(tooltipY - 80, 10)}px;"
            >
                <!-- Date -->
                <div
                    class="text-gray-400 text-[10px] uppercase tracking-wide mb-2"
                >
                    {formatDate(tooltipData.time)}
                </div>

                <!-- Equity -->
                <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span class="text-gray-300">Equity</span>
                    </div>
                    <span class="font-mono font-semibold text-white">
                        ${formatMoney(tooltipData.equity)}
                    </span>
                </div>

                <!-- Balance -->
                <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 bg-gray-500 rounded-full"></span>
                        <span class="text-gray-300">Balance</span>
                    </div>
                    <span class="font-mono font-medium text-gray-200">
                        ${formatMoney(tooltipData.balance)}
                    </span>
                </div>

                <!-- Floating P/L -->
                <div
                    class="flex items-center justify-between pt-1.5 border-t border-gray-700/50"
                >
                    <span class="text-gray-400">Floating P/L</span>
                    <span
                        class="font-mono font-semibold {tooltipData.floatingPL >=
                        0
                            ? 'text-green-400'
                            : 'text-red-400'}"
                    >
                        {tooltipData.floatingPL >= 0 ? "+" : ""}{formatMoney(
                            tooltipData.floatingPL,
                        )}
                    </span>
                </div>
            </div>
        {/if}

        <!-- Loading Overlay -->
        {#if isLoading}
            <div
                class="absolute inset-0 bg-gray-50/80 dark:bg-dark-bg/80 flex items-center justify-center rounded-lg"
            >
                <div class="flex items-center gap-2 text-gray-500">
                    <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                            fill="none"
                        ></circle>
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    <span class="text-sm">Loading...</span>
                </div>
            </div>
        {/if}

        <!-- No Data State -->
        {#if !isLoading && equitySnapshots.length === 0 && equityCurve.length === 0}
            <div
                class="absolute inset-0 flex flex-col items-center justify-center text-gray-400"
            >
                <svg
                    class="w-12 h-12 mb-2 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                    />
                </svg>
                <span class="text-sm">No equity data available yet</span>
                <span class="text-xs text-gray-500 mt-1"
                    >Data will appear after trading activity</span
                >
            </div>
        {/if}
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-3 gap-3 mt-4">
        {#if equitySnapshots.length > 0 || equityCurve.length > 0}
            {@const chartData =
                equitySnapshots.length > 0
                    ? equitySnapshots
                    : equityCurve.map((e) => ({
                          equity: e,
                          balance: e,
                          floatingPL: 0,
                      }))}
            {@const latest = chartData[chartData.length - 1]}
            {@const first = chartData[0]}
            {@const growth = first?.equity
                ? ((latest.equity - first.equity) / first.equity) * 100
                : 0}
            {@const maxEquity = Math.max(...chartData.map((d) => d.equity))}

            <div
                class="bg-gray-50 dark:bg-dark-bg/30 rounded-lg p-3 text-center"
            >
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Current
                </div>
                <div
                    class="font-mono font-semibold text-gray-900 dark:text-white"
                >
                    ${formatMoney(latest.equity)}
                </div>
            </div>
            <div
                class="bg-gray-50 dark:bg-dark-bg/30 rounded-lg p-3 text-center"
            >
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Growth
                </div>
                <div
                    class="font-mono font-semibold {growth >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'}"
                >
                    {growth >= 0 ? "+" : ""}{growth.toFixed(2)}%
                </div>
            </div>
            <div
                class="bg-gray-50 dark:bg-dark-bg/30 rounded-lg p-3 text-center"
            >
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Peak
                </div>
                <div
                    class="font-mono font-semibold text-blue-600 dark:text-blue-400"
                >
                    ${formatMoney(maxEquity)}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .equity-chart-container {
        @apply w-full;
    }
</style>
