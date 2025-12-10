<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
    import { createChart, ColorType } from "lightweight-charts";
    import EquityChart from "$lib/components/EquityChart.svelte";
    import TradingCalendar from "$lib/components/TradingCalendar.svelte";
    import AiAnalysisModal from "$lib/components/AiAnalysisModal.svelte";
    import DrawingToolbar from "$lib/chart/DrawingToolbar.svelte";
    import DrawingOverlay from "$lib/chart/DrawingOverlay.svelte";
    import {
        DrawingManager,
        type Drawing,
        type DrawingTool,
        type Point,
    } from "$lib/chart/DrawingManager";
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

    // Chart Modal State (for trade chart, not equity)
    let showChartModal = false;
    let selectedTrade: any = null;
    let chartContainerRef: HTMLDivElement;
    let chart: any;
    let candlestickSeries: any;
    let entryLine: any;
    let slLine: any;
    let tpLine: any;

    // Timeframe State
    let currentTimeframe = 15;
    let baseM1Data: any[] = [];
    const timeframes = [
        { label: "M1", value: 1 },
        { label: "M5", value: 5 },
        { label: "M15", value: 15 },
        { label: "H1", value: 60 },
        { label: "H4", value: 240 },
        { label: "D1", value: 1440 },
    ];

    // Fullscreen state
    let isFullscreen = false;

    // AI Analysis Modal state
    let showAiModal = false;

    // Filter State
    let filterSymbol = "ALL";
    let filterType = "ALL";
    let filterOutcome = "ALL";

    $: uniqueSymbols = trader ? ["ALL", ...new Set(trader.history.map((t: any) => t.symbol))].sort() : ["ALL"];

    $: filteredHistory = trader ? trader.history.filter((trade: any) => {
        const matchSymbol = filterSymbol === "ALL" || trade.symbol === filterSymbol;
        const matchType = filterType === "ALL" || trade.type === filterType;
        const matchOutcome = filterOutcome === "ALL" || 
            (filterOutcome === "WIN" && trade.profit >= 0) ||
            (filterOutcome === "LOSS" && trade.profit < 0);
        
        return matchSymbol && matchType && matchOutcome;
    }) : [];

    function toggleFullscreen() {
        isFullscreen = !isFullscreen;
        // Resize chart after state change
        setTimeout(() => {
            if (chart) {
                chart.applyOptions({
                    width: chartContainerRef?.clientWidth || 0,
                    height: chartContainerRef?.clientHeight || 0,
                });
            }
        }, 100);
    }

    // Drawing Tools State (TradingView-style)
    let drawingManager: DrawingManager | null = null;
    let drawings: Drawing[] = [];
    let drawingState: import("$lib/chart/DrawingManager").DrawingState = {
        tool: "none",
        mode: "idle",
        isDrawing: false,
        isDragging: false,
        startPoint: null,
        currentPoint: null,
        selectedId: null,
        hoveredId: null,
        dragOffset: null,
        rawStartScreen: null,
        rawCurrentScreen: null,
    };
    let chartCursor: import("$lib/chart/DrawingManager").CursorStyle =
        "default";
    let magnetEnabled = true;

    // Toggle magnet mode
    function handleToggleMagnet() {
        magnetEnabled = !magnetEnabled;
        if (drawingManager) {
            drawingManager.setSnapEnabled(magnetEnabled);
        }
    }

    // Initialize DrawingManager when chart is ready
    function initDrawingManager() {
        if (!chart || !candlestickSeries) return;

        drawingManager = new DrawingManager(chart, candlestickSeries);
        drawingManager.setCandleData(baseM1Data);

        // Sync current magnet state
        drawingManager.setSnapEnabled(magnetEnabled);

        drawingManager.setCallbacks({
            onDrawingsChange: (d) => {
                drawings = d;
            },
            onStateChange: (s) => {
                drawingState = s;
            },
            onCursorChange: (c) => {
                chartCursor = c;
            },
        });
    }

    // Drawing Tool Handlers
    function handleSelectTool(
        event: CustomEvent<import("$lib/chart/DrawingManager").DrawingTool>,
    ) {
        if (drawingManager) {
            drawingManager.setTool(event.detail);
            drawingState = drawingManager.getState();
        }
    }

    function handleClearDrawings() {
        if (drawingManager) {
            drawingManager.clearAll();
            drawings = [];
            drawingState = drawingManager.getState();
        }
    }

    function handleDeleteSelected() {
        if (drawingManager) {
            drawingManager.deleteSelected();
            drawings = drawingManager.getDrawings();
            drawingState = drawingManager.getState();
        }
    }

    function handleCancelDrawing() {
        if (drawingManager) {
            drawingManager.cancelDrawing();
            drawingState = drawingManager.getState();
        }
    }

    // TradingView-style drag handlers
    function handleChartMouseDown(event: MouseEvent) {
        if (!drawingManager || !chartContainerRef) return;

        const rect = chartContainerRef.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        drawingManager.handleMouseDown(x, y);
        drawingState = drawingManager.getState();
        drawings = drawingManager.getDrawings();

        // Prevent chart from panning when drawing, dragging, or resizing
        if (
            drawingState.isDrawing ||
            drawingState.isDragging ||
            drawingState.isResizing
        ) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    function handleChartMouseMove(event: MouseEvent) {
        if (!drawingManager || !chartContainerRef) return;

        const rect = chartContainerRef.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        drawingManager.handleMouseMove(x, y);
        drawingState = drawingManager.getState();

        // Prevent chart from panning when drawing, dragging, or resizing
        if (
            drawingState.isDrawing ||
            drawingState.isDragging ||
            drawingState.isResizing
        ) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    function handleChartMouseUp(event: MouseEvent) {
        if (!drawingManager || !chartContainerRef) return;

        const rect = chartContainerRef.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check states before handling mouseUp (they will be reset after)
        const wasInteracting =
            drawingState.isDrawing ||
            drawingState.isDragging ||
            drawingState.isResizing;

        drawingManager.handleMouseUp(x, y);
        drawingState = drawingManager.getState();
        drawings = drawingManager.getDrawings();

        // Prevent chart from panning
        if (wasInteracting) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    function handleChartMouseLeave() {
        // Cancel drawing if mouse leaves chart while drawing
        if (drawingState.isDrawing && drawingManager) {
            drawingManager.cancelDrawing();
            drawingState = drawingManager.getState();
        }
    }

    // Touch Event Handlers for Mobile/Tablet
    function handleChartTouchStart(event: TouchEvent) {
        if (!drawingManager || !chartContainerRef) return;
        // Only handle single touch (ignore multi-touch like pinch)
        if (event.touches.length !== 1) return;

        event.preventDefault(); // Prevent scrolling/zooming

        // Enable touch mode for larger hit targets
        drawingManager.setTouchMode(true);

        const touch = event.touches[0];
        const rect = chartContainerRef.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        drawingManager.handleMouseDown(x, y);
        drawingState = drawingManager.getState();
        drawings = drawingManager.getDrawings();
    }

    function handleChartTouchMove(event: TouchEvent) {
        if (!drawingManager || !chartContainerRef) return;
        if (event.touches.length !== 1) return;

        event.preventDefault();
        const touch = event.touches[0];
        const rect = chartContainerRef.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        drawingManager.handleMouseMove(x, y);
        drawingState = drawingManager.getState();
    }

    function handleChartTouchEnd(event: TouchEvent) {
        if (!drawingManager || !chartContainerRef) return;

        event.preventDefault();
        const touch = event.changedTouches[0];
        const rect = chartContainerRef.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        drawingManager.handleMouseUp(x, y);
        drawingState = drawingManager.getState();
        drawings = drawingManager.getDrawings();
    }

    function handleChartTouchCancel() {
        if (drawingManager) {
            drawingManager.cancelDrawing();
            drawingState = drawingManager.getState();
        }
    }

    // Helper: Generate Mock M5 from M15
    function generateMockM5(m15Data: any[]) {
        const m5Data: any[] = [];
        for (const candle of m15Data) {
            const time = candle.time;
            const O = candle.open;
            const H = candle.high;
            const L = candle.low;
            const C = candle.close;

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
                { time: time + 600, open: c2_close, close: C, high: 0, low: 0 },
            ];

            candles.forEach((c, i) => {
                let h = Math.max(c.open, c.close);
                let l = Math.min(c.open, c.close);
                if (i === highIdx) h = H;
                else h = h + Math.random() * (H - h) * 0.6;
                if (i === lowIdx) l = L;
                else l = l - Math.random() * (l - L) * 0.6;
                c.high = Math.min(H, h);
                c.low = Math.max(L, l);
            });

            candles[highIdx].high = H;
            candles[lowIdx].low = L;
            m5Data.push(...candles);
        }
        return m5Data;
    }

    // Helper: Resample Data
    function resampleData(data: any[], periodMinutes: number) {
        if (periodMinutes === 5) return data;
        const resampled: any[] = [];
        let currentCandle: any = null;
        const periodSeconds = periodMinutes * 60;

        for (const candle of data) {
            const periodStart =
                Math.floor(candle.time / periodSeconds) * periodSeconds;
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
                currentCandle.high = Math.max(currentCandle.high, candle.high);
                currentCandle.low = Math.min(currentCandle.low, candle.low);
                currentCandle.close = candle.close;
            }
        }
        if (currentCandle) resampled.push(currentCandle);
        return resampled;
    }

    // Update Chart Timeframe
    function updateChartTimeframe(period: number) {
        if (!chart || !candlestickSeries || baseM1Data.length === 0) return;
        currentTimeframe = period;

        const processedData = resampleData(baseM1Data, period);
        candlestickSeries.setData(processedData);

        // Update watermark
        const tfLabel =
            timeframes.find((t) => t.value === period)?.label || "M15";
        chart.applyOptions({
            watermark: { text: `${selectedTrade?.symbol} ${tfLabel}` },
        });

        // Update lines - start from entry time, not chart start
        if (processedData.length > 0 && selectedTrade) {
            const THAILAND_OFFSET = 7 * 60 * 60;
            const entryTime =
                new Date(selectedTrade.openTime).getTime() / 1000 +
                THAILAND_OFFSET;

            // Find nearest candle time for entry
            let entryStartTime = processedData[0].time;
            let minDiff = Math.abs(processedData[0].time - entryTime);
            for (const candle of processedData) {
                const diff = Math.abs(candle.time - entryTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    entryStartTime = candle.time;
                }
            }

            const endTime = processedData[processedData.length - 1].time;

            if (entryLine)
                entryLine.setData([
                    { time: entryStartTime, value: selectedTrade.openPrice },
                    { time: endTime, value: selectedTrade.openPrice },
                ]);
            if (slLine && selectedTrade.sl > 0)
                slLine.setData([
                    { time: entryStartTime, value: selectedTrade.sl },
                    { time: endTime, value: selectedTrade.sl },
                ]);
            if (tpLine && selectedTrade.tp > 0)
                tpLine.setData([
                    { time: entryStartTime, value: selectedTrade.tp },
                    { time: endTime, value: selectedTrade.tp },
                ]);
        }

        chart.timeScale().fitContent();
    }

    async function openChart(trade: any) {
        selectedTrade = trade;
        showChartModal = true;
        currentTimeframe = 15; // Reset to M15
        baseM1Data = []; // Reset base data

        // Wait for modal to render
        setTimeout(async () => {
            if (!chartContainerRef) return;

            // Calculate time range (e.g., +/- 4 hours around open/close)
            const openTime = new Date(trade.openTime).getTime();
            const closeTime = new Date(trade.closeTime).getTime();
            const buffer = 12 * 60 * 60 * 1000; // 12 hours - เพิ่มจำนวน candle ก่อนและหลัง

            const from = new Date(openTime - buffer).toISOString();
            const to = new Date(closeTime + buffer).toISOString();

            // Fetch M1 candles (real data for maximum detail)
            const res = await fetch(
                `/api/candles?symbol=${trade.symbol}&from=${from}&to=${to}&timeframe=M1`,
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
                    rightOffset: 5,
                },
                localization: {
                    timeFormatter: (timestamp: number) => {
                        // Data already has Thailand offset, so use UTC to display correctly
                        const date = new Date(timestamp * 1000);
                        const hours = date
                            .getUTCHours()
                            .toString()
                            .padStart(2, "0");
                        const minutes = date
                            .getUTCMinutes()
                            .toString()
                            .padStart(2, "0");
                        return `${hours}:${minutes}`;
                    },
                },
                watermark: {
                    visible: true,
                    fontSize: 48,
                    horzAlign: "center",
                    vertAlign: "center",
                    color: "rgba(255, 255, 255, 0.1)",
                    text: `${trade.symbol} M5`,
                },
            });

            candlestickSeries = chart.addCandlestickSeries({
                upColor: "#10B981",
                downColor: "#EF4444",
                borderVisible: false,
                wickUpColor: "#10B981",
                wickDownColor: "#EF4444",
            });

            // Format candle data with Thailand timezone offset
            const THAILAND_OFFSET = 7 * 60 * 60; // 7 hours in seconds
            baseM1Data = candles.map((c: any) => ({
                time: new Date(c.time).getTime() / 1000 + THAILAND_OFFSET,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }));

            // Use M5 base data, resample to M15 for initial display
            const chartData = resampleData(baseM1Data, 15);

            candlestickSeries.setData(chartData);

            // Add Entry and Exit markers
            const entryTime =
                new Date(trade.openTime).getTime() / 1000 + THAILAND_OFFSET;
            const exitTime =
                new Date(trade.closeTime).getTime() / 1000 + THAILAND_OFFSET;

            // Find nearest candle times for markers
            const findNearestTime = (targetTime: number) => {
                let nearest = chartData[0].time;
                let minDiff = Math.abs(chartData[0].time - targetTime);
                for (const candle of chartData) {
                    const diff = Math.abs(candle.time - targetTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        nearest = candle.time;
                    }
                }
                return nearest;
            };

            const markers = [
                {
                    time: findNearestTime(entryTime),
                    position: trade.type === "BUY" ? "belowBar" : "aboveBar",
                    color: trade.type === "BUY" ? "#10B981" : "#EF4444",
                    shape: trade.type === "BUY" ? "arrowUp" : "arrowDown",
                    text: `Entry ${trade.type}`,
                },
                {
                    time: findNearestTime(exitTime),
                    position: trade.profit >= 0 ? "aboveBar" : "belowBar",
                    color: trade.profit >= 0 ? "#10B981" : "#EF4444",
                    shape: "circle",
                    text: `Exit ${trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}`,
                },
            ];

            candlestickSeries.setMarkers(markers as any);

            // Get the nearest candle time for entry (for starting lines from entry point)
            const entryStartTime = findNearestTime(entryTime);

            // Add Entry Line (starts from entry point)
            entryLine = chart.addLineSeries({
                color: "#3B82F6",
                lineWidth: 2,
                lineStyle: 2,
                title: `Entry (${trade.type})`,
            });
            entryLine.setData([
                { time: entryStartTime, value: trade.openPrice },
                {
                    time: chartData[chartData.length - 1].time,
                    value: trade.openPrice,
                },
            ]);

            // Add SL Line (starts from entry point)
            if (trade.sl > 0) {
                slLine = chart.addLineSeries({
                    color: "#EF4444",
                    lineWidth: 2,
                    lineStyle: 2,
                    title: "SL",
                });
                slLine.setData([
                    { time: entryStartTime, value: trade.sl },
                    {
                        time: chartData[chartData.length - 1].time,
                        value: trade.sl,
                    },
                ]);

                // Add red zone between Entry and SL
                // For BUY: SL is below entry (fill bottom)
                // For SELL: SL is above entry (fill top)
                const isBuy = trade.type === "BUY";
                const slZone = chart.addBaselineSeries({
                    baseValue: { type: "price", price: trade.openPrice },
                    topLineColor: "rgba(239, 68, 68, 0)",
                    topFillColor1: isBuy
                        ? "rgba(239, 68, 68, 0)"
                        : "rgba(239, 68, 68, 0.05)",
                    topFillColor2: isBuy
                        ? "rgba(239, 68, 68, 0)"
                        : "rgba(239, 68, 68, 0.15)",
                    bottomLineColor: "rgba(239, 68, 68, 0)",
                    bottomFillColor1: isBuy
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(239, 68, 68, 0)",
                    bottomFillColor2: isBuy
                        ? "rgba(239, 68, 68, 0.05)"
                        : "rgba(239, 68, 68, 0)",
                    lineWidth: 0,
                });
                slZone.setData([
                    { time: entryStartTime, value: trade.sl },
                    {
                        time: chartData[chartData.length - 1].time,
                        value: trade.sl,
                    },
                ]);
            }

            // Add TP Line (starts from entry point)
            if (trade.tp > 0) {
                tpLine = chart.addLineSeries({
                    color: "#10B981",
                    lineWidth: 2,
                    lineStyle: 2,
                    title: "TP",
                });
                tpLine.setData([
                    { time: entryStartTime, value: trade.tp },
                    {
                        time: chartData[chartData.length - 1].time,
                        value: trade.tp,
                    },
                ]);

                // Add green zone between Entry and TP
                // For BUY: TP is above entry (fill top)
                // For SELL: TP is below entry (fill bottom)
                const isBuy = trade.type === "BUY";
                const tpZone = chart.addBaselineSeries({
                    baseValue: { type: "price", price: trade.openPrice },
                    topLineColor: "rgba(16, 185, 129, 0)",
                    topFillColor1: isBuy
                        ? "rgba(16, 185, 129, 0.05)"
                        : "rgba(16, 185, 129, 0)",
                    topFillColor2: isBuy
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(16, 185, 129, 0)",
                    bottomLineColor: "rgba(16, 185, 129, 0)",
                    bottomFillColor1: isBuy
                        ? "rgba(16, 185, 129, 0)"
                        : "rgba(16, 185, 129, 0.15)",
                    bottomFillColor2: isBuy
                        ? "rgba(16, 185, 129, 0)"
                        : "rgba(16, 185, 129, 0.05)",
                    lineWidth: 0,
                });
                tpZone.setData([
                    { time: entryStartTime, value: trade.tp },
                    {
                        time: chartData[chartData.length - 1].time,
                        value: trade.tp,
                    },
                ]);
            }

            chart.timeScale().fitContent();

            // Initialize drawing tools
            initDrawingManager();
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
                class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up card-hover"
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
                    <!-- Ask AI Button -->
                    <button
                        class="ml-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/25"
                        on:click={() => (showAiModal = true)}
                    >
                        <span>🤖</span>
                        <span>AI Analysis</span>
                    </button>
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
                <!-- 1. Left Column: Equity Curve + Recent History -->
                <div class="lg:col-span-2 space-y-6">
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up stagger-1 card-hover"
                    >
                        <EquityChart
                            equitySnapshots={trader.equitySnapshots || []}
                            equityCurve={trader.equityCurve || []}
                        />
                    </div>

                    <!-- Trade History (directly below Equity Chart) -->
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden animate-fade-in-up stagger-2 card-hover"
                    >
                        <div
                            class="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                            <h3
                                class="text-lg font-semibold text-gray-900 dark:text-white"
                            >
                                Recent History
                            </h3>
                            
                            <!-- Filters -->
                            <div class="flex flex-wrap items-center gap-3">
                                <div class="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                    <span class="hidden sm:inline">Filter</span>
                                </div>

                                <!-- Symbol Filter -->
                                <div class="relative">
                                    <select 
                                        bind:value={filterSymbol}
                                        class="appearance-none pl-3 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
                                    >
                                        {#each uniqueSymbols as symbol}
                                            <option value={symbol}>{symbol === 'ALL' ? 'All Symbols' : symbol}</option>
                                        {/each}
                                    </select>
                                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>

                                <!-- Type Filter -->
                                <div class="relative">
                                    <select 
                                        bind:value={filterType}
                                        class="appearance-none pl-3 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
                                    >
                                        <option value="ALL">All Types</option>
                                        <option value="BUY">Buy</option>
                                        <option value="SELL">Sell</option>
                                    </select>
                                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>

                                <!-- Outcome Filter -->
                                <div class="relative">
                                    <select 
                                        bind:value={filterOutcome}
                                        class="appearance-none pl-3 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
                                    >
                                        <option value="ALL">All Outcomes</option>
                                        <option value="WIN">Win</option>
                                        <option value="LOSS">Loss</option>
                                    </select>
                                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>

                                <!-- Clear Filter Button -->
                                {#if filterSymbol !== 'ALL' || filterType !== 'ALL' || filterOutcome !== 'ALL'}
                                    <button 
                                        on:click={() => {
                                            filterSymbol = 'ALL';
                                            filterType = 'ALL';
                                            filterOutcome = 'ALL';
                                        }}
                                        class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                        title="Clear Filters"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                {/if}
                            </div>
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
                                    {#each filteredHistory as trade, i}
                                        <tr
                                            class="border-b dark:border-dark-border hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] active:bg-blue-100 dark:active:bg-blue-900/20"
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

                <!-- 2. Sidebar Stats (Right on Desktop, 2nd on Mobile) -->
                <div class="lg:col-span-1 space-y-6 h-fit">
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up stagger-3 card-hover"
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
                                    class="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2 overflow-hidden"
                                >
                                    <div
                                        class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-700 ease-out"
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
                                        +${formatMoney(trader.stats.bestTrade)}
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
                                            : ""}${formatMoney(
                                            trader.stats.worstTrade,
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Session Performance -->
                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 mb-6 animate-fade-in-up stagger-4 card-hover"
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

                    <!-- Trading Performance Calendar -->
                    <div class="mb-6 animate-fade-in-up stagger-5">
                        <TradingCalendar
                            dailyData={trader.dailyHistory || []}
                        />
                    </div>

                    <div
                        class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up stagger-6 card-hover"
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
            </div>
        {/if}
    </div>
</div>

<!-- Chart Modal -->
{#if showChartModal}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm {isFullscreen
            ? 'p-0'
            : 'p-4'}"
    >
        <div
            class="bg-white dark:bg-dark-surface shadow-2xl overflow-hidden border border-gray-200 dark:border-dark-border transition-all duration-300 flex flex-col
                {isFullscreen
                ? 'w-full h-full rounded-none'
                : 'w-full max-w-4xl rounded-xl'}"
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
                        Entry ({selectedTrade?.type}): {Number(
                            selectedTrade?.openPrice || 0,
                        ).toFixed(2)}
                        → {Number(selectedTrade?.closePrice || 0).toFixed(2)}
                        <span class="hidden sm:inline">|</span>
                        <br class="sm:hidden" />
                        <span
                            class="font-semibold {(selectedTrade?.profit ||
                                0) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'}"
                        >
                            Profit: {(selectedTrade?.profit || 0) >= 0
                                ? "+"
                                : ""}${Number(
                                selectedTrade?.profit || 0,
                            ).toFixed(2)}
                        </span>
                    </p>
                    <p class="text-xs text-gray-400 mt-1">
                        Open: {new Date(selectedTrade?.openTime).toLocaleString(
                            "th-TH",
                            { timeZone: "Asia/Bangkok" },
                        )}
                    </p>
                    <p class="text-xs text-gray-400">
                        Close: {new Date(
                            selectedTrade?.closeTime,
                        ).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                    </p>
                </div>

                <!-- Timeframe Dropdown -->
                <div class="flex items-center gap-2">
                    <select
                        bind:value={currentTimeframe}
                        on:change={() => updateChartTimeframe(currentTimeframe)}
                        class="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {#each timeframes as tf}
                            <option value={tf.value}>{tf.label}</option>
                        {/each}
                    </select>

                    <!-- Fullscreen Toggle -->
                    <button
                        on:click={toggleFullscreen}
                        class="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {#if isFullscreen}
                            <!-- Minimize Icon -->
                            <svg
                                class="w-5 h-5 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                                />
                            </svg>
                        {:else}
                            <!-- Expand Icon -->
                            <svg
                                class="w-5 h-5 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                                />
                            </svg>
                        {/if}
                    </button>

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
            </div>

            <!-- Drawing Tools Toolbar -->
            <DrawingToolbar
                {drawingState}
                hasDrawings={drawings.length > 0}
                {magnetEnabled}
                on:selectTool={handleSelectTool}
                on:clearAll={handleClearDrawings}
                on:deleteSelected={handleDeleteSelected}
                on:cancel={handleCancelDrawing}
                on:toggleMagnet={handleToggleMagnet}
            />

            <!-- Chart Container -->
            <div class="p-4 bg-gray-900 {isFullscreen ? 'flex-1' : ''}">
                <div
                    class="relative w-full {isFullscreen
                        ? 'h-full'
                        : 'h-[400px]'}"
                    role="application"
                    style="touch-action: none; cursor: {chartCursor};"
                    on:mousedown={handleChartMouseDown}
                    on:mousemove={handleChartMouseMove}
                    on:mouseup={handleChartMouseUp}
                    on:mouseleave={handleChartMouseLeave}
                    on:touchstart={handleChartTouchStart}
                    on:touchmove={handleChartTouchMove}
                    on:touchend={handleChartTouchEnd}
                    on:touchcancel={handleChartTouchCancel}
                >
                    <div
                        bind:this={chartContainerRef}
                        class="w-full h-full"
                    ></div>

                    <!-- Drawing Overlay -->
                    <DrawingOverlay
                        {chart}
                        series={candlestickSeries}
                        {drawings}
                        {drawingState}
                    />
                </div>
            </div>

            <!-- Legend -->
            <div class="p-4 bg-gray-50 dark:bg-dark-bg/50 flex gap-4 text-sm">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span class="text-gray-600 dark:text-gray-300"
                        >Entry ({selectedTrade?.type}): {Number(
                            selectedTrade?.openPrice || 0,
                        ).toFixed(2)}</span
                    >
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                    <span class="text-gray-600 dark:text-gray-300"
                        >SL: {selectedTrade?.sl
                            ? Number(selectedTrade.sl).toFixed(2)
                            : "-"}</span
                    >
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    <span class="text-gray-600 dark:text-gray-300"
                        >TP: {selectedTrade?.tp
                            ? Number(selectedTrade.tp).toFixed(2)
                            : "-"}</span
                    >
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- AI Analysis Modal -->
<AiAnalysisModal
    bind:show={showAiModal}
    trader={{ ...trader, rank }}
    on:close={() => (showAiModal = false)}
/>
