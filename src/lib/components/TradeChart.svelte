<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        createChart,
        ColorType,
        CrosshairMode,
        LineStyle,
    } from "lightweight-charts";
    import type { IChartApi, ISeriesApi } from "lightweight-charts";
    import { supabase } from "$lib/supabaseClient";

    // --- Props ---
    export let trade: any; // The trade object
    export let initialCandles: any[] = []; // Initial candle data (M15 default)

    // --- State ---
    let chartContainer: HTMLElement;
    let chart: IChartApi;
    let candlestickSeries: ISeriesApi<"Candlestick">;
    let entryLine: any;
    let slLine: any;
    let tpLine: any;

    let currentTimeframe = 15; // Default M15
    let isLoading = false;
    let baseData: any[] = []; // Store the fetched base data (M15)

    // --- Timeframe Options ---
    const timeframes = [
        { label: "M15", value: 15 },
        { label: "H1", value: 60 },
        { label: "H4", value: 240 },
    ];

    // --- Helper: Format Data ---
    function formatCandles(data: any[]) {
        return data
            .sort(
                (a, b) =>
                    new Date(a.time).getTime() - new Date(b.time).getTime(),
            )
            .map((item) => ({
                time: new Date(item.time).getTime() / 1000, // Unix timestamp in seconds
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close),
            }));
    }

    // --- Helper: Resample Data ---
    function resampleData(data: any[], periodMinutes: number) {
        // If period is 15 (base) or less, just return data (we don't have M5 real data yet)
        if (periodMinutes <= 15) {
            return data;
        }

        const resampled = [];
        let currentCandle: any = null;
        const periodSeconds = periodMinutes * 60;

        for (const candle of data) {
            const candleTime = candle.time as number;
            // Align to period start
            const periodStart =
                Math.floor(candleTime / periodSeconds) * periodSeconds;

            if (!currentCandle || currentCandle.time !== periodStart) {
                if (currentCandle) resampled.push(currentCandle);

                currentCandle = {
                    time: periodStart,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                };
            } else {
                // Update current candle
                currentCandle.high = Math.max(currentCandle.high, candle.high);
                currentCandle.low = Math.min(currentCandle.low, candle.low);
                currentCandle.close = candle.close;
            }
        }
        if (currentCandle) resampled.push(currentCandle);
        return resampled;
    }

    // --- Fetch Data ---
    async function fetchAndSetData(tf: number) {
        isLoading = true;
        try {
            // If we already have base data (M15), we might not need to refetch if we are just resampling up.
            // But to be safe and "production ready", let's ensure we have data.
            // For this implementation, we assume 'initialCandles' passed in is M15.
            // If we switch to H1, we resample M15.

            // If baseData is empty, use initialCandles
            if (baseData.length === 0 && initialCandles.length > 0) {
                baseData = formatCandles(initialCandles);
            }

            // If we wanted to fetch fresh data from DB:
            if (baseData.length === 0) {
                const symbol = trade.symbol.replace(".s", "");
                const { data, error } = await supabase
                    .from("market_data")
                    .select("*")
                    .eq("symbol", symbol)
                    .order("time", { ascending: false })
                    .limit(1000);
                if (!error && data) {
                    data.reverse();
                    baseData = formatCandles(data);
                }
            }

            // Resample
            const processedData = resampleData(baseData, tf);

            if (candlestickSeries) {
                candlestickSeries.setData(processedData);

                // Update Watermark
                const tfLabel =
                    timeframes.find((t) => t.value === tf)?.label || "M15";
                const options: any = {
                    watermark: {
                        text: `${trade.symbol} ${tfLabel}`,
                    },
                };
                chart.applyOptions(options);

                // Update Lines
                if (processedData.length > 0) {
                    const startTime = processedData[0].time;
                    const endTime =
                        processedData[processedData.length - 1].time;
                    updateLines(startTime, endTime);
                }

                chart.timeScale().fitContent();
            }
        } catch (e) {
            console.error("Error updating chart:", e);
        } finally {
            isLoading = false;
        }
    }

    function updateLines(startTime: any, endTime: any) {
        if (entryLine) {
            entryLine.setData([
                { time: startTime, value: trade.open_price },
                { time: endTime, value: trade.open_price },
            ]);
        }
        if (slLine && trade.sl > 0) {
            slLine.setData([
                { time: startTime, value: trade.sl },
                { time: endTime, value: trade.sl },
            ]);
        }
        if (tpLine && trade.tp > 0) {
            tpLine.setData([
                { time: startTime, value: trade.tp },
                { time: endTime, value: trade.tp },
            ]);
        }
    }

    // --- Lifecycle ---
    onMount(() => {
        if (!chartContainer) return;

        // 1. Create Chart
        const chartOptions: any = {
            layout: {
                background: { type: ColorType.Solid, color: "#111827" },
                textColor: "#D1D5DB",
            },
            grid: {
                vertLines: { color: "#374151" },
                horzLines: { color: "#374151" },
            },
            width: chartContainer.clientWidth,
            height: 500,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            watermark: {
                visible: true,
                fontSize: 48,
                horzAlign: "center",
                vertAlign: "center",
                color: "rgba(255, 255, 255, 0.1)",
                text: `${trade.symbol} M15`,
            },
        };

        chart = createChart(chartContainer, chartOptions);

        // 2. Add Series
        candlestickSeries = chart.addCandlestickSeries({
            upColor: "#10B981",
            downColor: "#EF4444",
            borderVisible: false,
            wickUpColor: "#10B981",
            wickDownColor: "#EF4444",
        });

        // 3. Add Lines
        entryLine = chart.addLineSeries({
            color: "#3B82F6",
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            title: "Entry",
        });

        if (trade.sl > 0) {
            slLine = chart.addLineSeries({
                color: "#EF4444",
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                title: "SL",
            });
        }

        if (trade.tp > 0) {
            tpLine = chart.addLineSeries({
                color: "#10B981",
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                title: "TP",
            });
        }

        // 4. Initial Load
        if (initialCandles && initialCandles.length > 0) {
            console.log("Setting initial data...", initialCandles.length);
            baseData = formatCandles(initialCandles);
            candlestickSeries.setData(baseData);

            // Update Watermark
            const options: any = {
                watermark: {
                    text: `${trade.symbol} M15`,
                },
            };
            chart.applyOptions(options);

            // Update Lines
            if (baseData.length > 0) {
                const startTime = baseData[0].time;
                const endTime = baseData[baseData.length - 1].time;
                updateLines(startTime, endTime);
            }

            setTimeout(() => {
                chart.timeScale().fitContent();
            }, 100);
        } else {
            console.log("No initial candles, fetching...");
            fetchAndSetData(15);
        }

        // 5. Resize Observer
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries.length === 0 || !entries[0].contentRect) return;
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        resizeObserver.observe(chartContainer);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    });
</script>

<div
    class="relative w-full h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-xl"
>
    <!-- Toolbar -->
    <div
        class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700"
    >
        <div class="flex items-center gap-2">
            <span class="text-white font-bold">{trade.symbol}</span>
            <span class="text-xs text-gray-400">|</span>
            <span class="text-xs text-gray-500"
                >({baseData.length} candles)</span
            >
            {#each timeframes as tf}
                <button
                    class="px-3 py-1 text-xs font-medium rounded transition-colors
                    {currentTimeframe === tf.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'}"
                    on:click={() => {
                        currentTimeframe = tf.value;
                        fetchAndSetData(tf.value);
                    }}
                    disabled={isLoading}
                >
                    {tf.label}
                </button>
            {/each}
        </div>
        <!-- Legend (Visual only, chart has its own legend) -->
        <div class="flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1">
                <div
                    class="w-3 h-0.5 bg-blue-500 border-dashed border-b border-blue-500"
                ></div>
                <span class="text-gray-300">Entry</span>
            </div>
            {#if trade.tp > 0}
                <div class="flex items-center gap-1">
                    <div
                        class="w-3 h-0.5 bg-green-500 border-dashed border-b border-green-500"
                    ></div>
                    <span class="text-gray-300">TP</span>
                </div>
            {/if}
            {#if trade.sl > 0}
                <div class="flex items-center gap-1">
                    <div
                        class="w-3 h-0.5 bg-red-500 border-dashed border-b border-red-500"
                    ></div>
                    <span class="text-gray-300">SL</span>
                </div>
            {/if}
        </div>
    </div>

    <!-- Chart Container -->
    <div class="relative flex-1 min-h-[500px]" bind:this={chartContainer}>
        {#if isLoading}
            <div
                class="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10 backdrop-blur-sm"
            >
                <div
                    class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
                ></div>
            </div>
        {/if}
    </div>
</div>
