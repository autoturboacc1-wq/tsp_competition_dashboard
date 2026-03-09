<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { createChart, ColorType, LineStyle } from "lightweight-charts";
    import { THAILAND_OFFSET_SECONDS } from "$lib/timezone";

    type Trader = {
        id: string;
        nickname: string;
    };

    export let traders: Trader[] = [];

    function hslToHex(h: number, s: number, l: number): string {
        s /= 100; l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    function generateColors(count: number): string[] {
        const colors: string[] = [];
        for (let i = 0; i < count; i++) {
            const hue = (i * 137.508) % 360;
            colors.push(hslToHex(hue, 70, 55));
        }
        return colors;
    }

    $: COLORS = generateColors(Math.max(traders.length, 16));

    let chartContainer: HTMLDivElement;
    let chart: any;
    let seriesMap = new Map<string, any>();
    let loading = false;
    let selectedTraders: string[] = [];
    let dropdownOpen = false;
    let selectedTimeframe = 30;
    const timeframes = [
        { label: '7D', days: 7 },
        { label: '14D', days: 14 },
        { label: '1M', days: 30 },
        { label: '3M', days: 90 },
        { label: 'All', days: 365 },
    ];

    // Tooltip state
    let tooltipVisible = false;
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipEntries: Array<{ nickname: string; color: string; value: number }> = [];
    let tooltipTime = 0;

    $: if (chart && selectedTraders) {
        loadSelectedData();
    }

    function changeTimeframe(days: number) {
        selectedTimeframe = days;
        // Clear all series so they reload with new timeframe
        for (const [id, series] of seriesMap) {
            chart?.removeSeries(series);
        }
        seriesMap = new Map();
        loadSelectedData();
    }

    function toggleTrader(id: string) {
        if (selectedTraders.includes(id)) {
            selectedTraders = selectedTraders.filter((t) => t !== id);
        } else {
            selectedTraders = [...selectedTraders, id];
        }
    }

    function selectAll() {
        selectedTraders = traders.map((t) => t.id);
    }

    function clearAll() {
        selectedTraders = [];
    }

    async function loadSelectedData() {
        if (!chart) return;

        // Remove old series
        for (const [id, series] of seriesMap) {
            if (!selectedTraders.includes(id)) {
                chart.removeSeries(series);
                seriesMap.delete(id);
            }
        }

        loading = true;

        // Load data for newly selected traders
        const toLoad = selectedTraders.filter((id) => !seriesMap.has(id));

        await Promise.all(
            toLoad.map(async (id) => {
                try {
                    const res = await fetch(`/api/equity-curve?participant_id=${id}&days=${selectedTimeframe}`);
                    const json = await res.json();

                    if (!json.success || !json.data?.length) return;

                    const traderIndex = traders.findIndex((t) => t.id === id);
                    const color = COLORS[selectedTraders.indexOf(id) % COLORS.length];
                    const nickname = traders[traderIndex]?.nickname || "Unknown";

                    const seriesData = json.data.map((d: any) => ({
                        time: (d.time + THAILAND_OFFSET_SECONDS) as any,
                        value: d.equity,
                    }));

                    const series = chart.addLineSeries({
                        color,
                        lineWidth: 2,
                        crosshairMarkerVisible: true,
                        crosshairMarkerRadius: 4,
                        crosshairMarkerBorderColor: color,
                        crosshairMarkerBackgroundColor: "#1F2937",
                        title: nickname,
                        lastValueVisible: true,
                        priceLineVisible: false,
                    });

                    series.setData(seriesData);
                    seriesMap.set(id, series);
                } catch (e) {
                    console.error(`Failed to load equity for ${id}:`, e);
                }
            })
        );

        if (seriesMap.size > 0) {
            chart.timeScale().fitContent();
        }

        loading = false;
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
            timeZone: "UTC",
        });
    }

    function initChart() {
        if (!chartContainer || chart) return;

        chart = createChart(chartContainer, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#9CA3AF",
                fontFamily: "'Inter', sans-serif",
            },
            grid: {
                vertLines: { color: "rgba(55, 65, 81, 0.5)", style: LineStyle.Dotted },
                horzLines: { color: "rgba(55, 65, 81, 0.5)", style: LineStyle.Dotted },
            },
            width: chartContainer.clientWidth,
            height: Math.max(320, Math.min(600, traders.length * 60)),
            rightPriceScale: {
                borderColor: "rgba(55, 65, 81, 0.5)",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: "rgba(55, 65, 81, 0.5)",
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
            },
            crosshair: {
                mode: 1,
                vertLine: { color: "rgba(59, 130, 246, 0.5)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#1F2937" },
                horzLine: { color: "rgba(59, 130, 246, 0.5)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#1F2937" },
            },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale: { mouseWheel: true, pinch: true },
        });

        chart.subscribeCrosshairMove((param: any) => {
            if (!param || !param.time || !param.point) {
                tooltipVisible = false;
                return;
            }

            tooltipTime = param.time;
            tooltipX = param.point.x;
            tooltipY = param.point.y;
            tooltipEntries = [];

            for (const [id, series] of seriesMap) {
                const data = param.seriesData.get(series);
                if (data) {
                    const idx = selectedTraders.indexOf(id);
                    const traderInfo = traders.find((t) => t.id === id);
                    tooltipEntries.push({
                        nickname: traderInfo?.nickname || "Unknown",
                        color: COLORS[idx % COLORS.length],
                        value: data.value,
                    });
                }
            }

            tooltipEntries.sort((a, b) => b.value - a.value);
            tooltipVisible = tooltipEntries.length > 0;
        });

        const resizeObserver = new ResizeObserver(() => {
            if (chart && chartContainer) {
                chart.applyOptions({ width: chartContainer.clientWidth });
            }
        });
        resizeObserver.observe(chartContainer);
    }

    onMount(() => {
        initChart();
        // Auto-select top 3 traders
        selectedTraders = traders.slice(0, Math.min(3, traders.length)).map((t) => t.id);
    });

    onDestroy(() => {
        if (chart) {
            chart.remove();
            chart = null;
        }
    });
</script>

<div class="p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
    <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold dark:text-white">Equity Comparison</h2>
        <div class="flex items-center gap-1 bg-gray-100 dark:bg-dark-bg/50 rounded-lg p-0.5">
            {#each timeframes as tf}
                <button
                    on:click={() => changeTimeframe(tf.days)}
                    class="px-2.5 py-1 text-xs font-medium rounded-md transition-all
                        {selectedTimeframe === tf.days
                            ? 'bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
                >
                    {tf.label}
                </button>
            {/each}
        </div>
    </div>

    <!-- Trader Selection Dropdown -->
    <div class="relative mb-4">
        <div
            role="button"
            tabindex="0"
            on:click={() => dropdownOpen = !dropdownOpen}
            on:keydown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    dropdownOpen = !dropdownOpen;
                }
            }}
            class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg/50 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
            <div class="flex flex-wrap gap-1.5 flex-1 min-h-[24px]">
                {#if selectedTraders.length === 0}
                    <span class="text-gray-400 dark:text-gray-500">Select traders to compare...</span>
                {:else}
                    {#each selectedTraders as id}
                        {@const trader = traders.find(t => t.id === id)}
                        {@const color = COLORS[selectedTraders.indexOf(id) % COLORS.length]}
                        {#if trader}
                            <span
                                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white rounded-full"
                                style="background-color: {color}"
                            >
                                {trader.nickname}
                                <button
                                    type="button"
                                    on:click|stopPropagation={() => toggleTrader(id)}
                                    class="ml-0.5 hover:text-gray-200"
                                >&times;</button>
                            </span>
                        {/if}
                    {/each}
                {/if}
            </div>
            <svg class="w-4 h-4 ml-2 text-gray-400 flex-shrink-0 transition-transform {dropdownOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>

        {#if dropdownOpen}
            <button
                type="button"
                class="fixed inset-0 z-40"
                aria-label="Close trader selector"
                on:click={() => dropdownOpen = false}
            ></button>
            <div class="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-lg max-h-60 overflow-y-auto">
                <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-dark-border sticky top-0 bg-white dark:bg-dark-surface">
                    <button type="button" on:click={selectAll} class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Select All</button>
                    <button type="button" on:click={clearAll} class="text-xs text-gray-500 dark:text-gray-400 hover:underline">Clear All</button>
                </div>
                {#each traders as trader, i}
                    {@const isSelected = selectedTraders.includes(trader.id)}
                    {@const color = isSelected ? COLORS[selectedTraders.indexOf(trader.id) % COLORS.length] : '#9CA3AF'}
                    <button
                        type="button"
                        on:click={() => toggleTrader(trader.id)}
                        class="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-border/30 transition-colors {isSelected ? 'bg-gray-50/50 dark:bg-dark-border/10' : ''}"
                    >
                        <span
                            class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                            style="border-color: {color}; background-color: {isSelected ? color : 'transparent'}"
                        >
                            {#if isSelected}
                                <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                </svg>
                            {/if}
                        </span>
                        <span class="dark:text-white">{trader.nickname}</span>
                    </button>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Chart -->
    <div class="relative">
        <div
            bind:this={chartContainer}
            class="w-full bg-gray-50 dark:bg-dark-bg/30 rounded-lg overflow-hidden"
        ></div>

        {#if loading}
            <div class="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-dark-bg/50 rounded-lg">
                <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </div>
            </div>
        {/if}

        {#if selectedTraders.length === 0 && !loading}
            <div class="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <div class="text-center">
                    <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span class="text-sm">Select traders to compare equity curves</span>
                </div>
            </div>
        {/if}

        <!-- Tooltip -->
        {#if tooltipVisible && tooltipEntries.length > 0}
            <div
                class="absolute pointer-events-none z-50 bg-gray-900/95 dark:bg-gray-800/95
                       text-white text-xs rounded-xl py-3 px-4 shadow-xl backdrop-blur-sm
                       border border-gray-700/50 min-w-[180px] transition-all duration-150"
                style="left: {Math.min(tooltipX + 15, (chartContainer?.clientWidth || 300) - 200)}px; top: {Math.max(tooltipY - 30, 10)}px;"
            >
                <div class="text-gray-400 text-[10px] uppercase tracking-wide mb-2">
                    {formatDate(tooltipTime)}
                </div>
                {#each tooltipEntries as entry}
                    <div class="flex items-center justify-between gap-4 mb-1">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full" style="background-color: {entry.color}"></span>
                            <span class="text-gray-300">{entry.nickname}</span>
                        </div>
                        <span class="font-mono font-semibold">${formatMoney(entry.value)}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
