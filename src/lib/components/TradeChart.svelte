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
    export let currentTimeframe = 15; // Default M15

    // --- State ---
    let chartContainer: HTMLElement;
    let chart: IChartApi;
    let candlestickSeries: ISeriesApi<"Candlestick">;
    let entryLine: any;
    let slLine: any;
    let tpLine: any;

    let isLoading = false;
    let baseM5Data: any[] = []; // Store the generated M5 data as base

    // --- Timeframe Options ---
    const timeframes = [
        { label: "M5", value: 5 },
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

    // --- Helper: Generate Mock M5 ---
    function generateMockM5(m15Data: any[]) {
        const m5Data = [];
        for (const candle of m15Data) {
            const time = candle.time;
            const O = candle.open;
            const H = candle.high;
            const L = candle.low;
            const C = candle.close;

            // We need 3 candles: c1, c2, c3
            const highIdx = Math.floor(Math.random() * 3);
            const lowIdx = Math.floor(Math.random() * 3);

            const volatility = (H - L) * 0.15;

            let c1_close = O + (C - O) / 3 + (Math.random() - 0.5) * volatility;
            let c2_close =
                O + (2 * (C - O)) / 3 + (Math.random() - 0.5) * volatility;

            c1_close = Math.max(L, Math.min(H, c1_close));
            c2_close = Math.max(L, Math.min(H, c2_close));

            const candles = [
                { time: time, open: O, close: c1_close, high: 0, low: 0 },
                {
                    time: time + 300,
                    open: c1_close,
                    close: c2_close,
                    high: 0,
                    low: 0,
                },
                {
                    time: time + 600,
                    open: c2_close,
                    close: C,
                    high: 0,
                    low: 0,
                },
            ];

            candles.forEach((c, i) => {
                let h = Math.max(c.open, c.close);
                let l = Math.min(c.open, c.close);

                if (i === highIdx) {
                    h = H;
                } else {
                    h = h + Math.random() * (H - h) * 0.6;
                }

                if (i === lowIdx) {
                    l = L;
                } else {
                    l = l - Math.random() * (l - L) * 0.6;
                }

                c.high = Math.min(H, h);
                c.low = Math.max(L, l);
            });

            // Force exact high/low on selected candles to ensure range coverage
            candles[highIdx].high = H;
            candles[lowIdx].low = L;

            m5Data.push(...candles);
        }
        return m5Data;
    }

    // --- Helper: Resample Data ---
    function resampleData(data: any[], periodMinutes: number) {
        // Base data is M5
        if (periodMinutes === 5) {
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
            // Ensure we have base M5 data
            if (baseM5Data.length === 0) {
                let m15Data: any[] = [];
                if (initialCandles && initialCandles.length > 0) {
                    m15Data = formatCandles(initialCandles);
                } else {
                    // Fallback fetch if no initial candles (rare case in this flow)
                    const symbol = trade.symbol.replace(".s", "");
                    const { data, error } = await supabase
                        .from("market_data")
                        .select("*")
                        .eq("symbol", symbol)
                        .order("time", { ascending: false })
                        .limit(1000);
                    if (!error && data) {
                        data.reverse();
                        m15Data = formatCandles(data);
                    }
                }
                // Generate M5 from M15
                if (m15Data.length > 0) {
                    baseM5Data = generateMockM5(m15Data);
                }
            }

            // Resample
            const processedData = resampleData(baseM5Data, tf);

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

    // Reactive update
    $: if (chart && currentTimeframe) {
        fetchAndSetData(currentTimeframe);
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
        // We start with M15 as default, but we'll use our fetchAndSetData to handle generation
        fetchAndSetData(currentTimeframe);

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
