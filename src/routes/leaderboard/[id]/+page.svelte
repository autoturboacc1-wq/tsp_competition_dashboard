<script lang="ts">
    import { tick } from "svelte";
    import { page } from "$app/stores";
    import { invalidateAll } from "$app/navigation";
    import { createChart, ColorType } from "lightweight-charts";
    import { THAILAND_OFFSET_SECONDS } from "$lib/timezone";
    import { getChartColors } from "$lib/chart/chartTheme";
    import { ASYNC_COPY } from "$lib/async-state";
    import EquityChart from "$lib/components/EquityChart.svelte";
    import TradingCalendar from "$lib/components/TradingCalendar.svelte";
    import AiAnalysisModal from "$lib/components/AiAnalysisModal.svelte";
    import PullToRefresh from "$lib/components/PullToRefresh.svelte";
    import StatusBanner from "$lib/components/StatusBanner.svelte";
    import TraderDetailSkeleton from "$lib/components/TraderDetailSkeleton.svelte";
    import DrawingToolbar from "$lib/chart/DrawingToolbar.svelte";
    import DrawingOverlay from "$lib/chart/DrawingOverlay.svelte";
    import BadgeList from "$lib/components/BadgeList.svelte";
    import ScoreBreakdown from "$lib/components/ScoreBreakdown.svelte";
    import AnalyticsDashboard from "$lib/components/AnalyticsDashboard.svelte";
    import RecentRhythmCard from "$lib/components/RecentRhythmCard.svelte";
    import {
        DrawingManager,
        type Drawing,
        type DrawingTool,
    } from "$lib/chart/DrawingManager";
    import type { PageData } from "./$types";

    export let data: PageData;

    $: analytics = data.analytics;

    $: id = $page.params.id;
    $: trader = data.trader;
    $: badges = data.badges || [];
    // Rank calculation would ideally come from server or context,
    // for now we might lose the global rank context in this view unless passed.
    // Let's assume for now we just show the data.
    // To get rank, we might need to fetch the leaderboard or pass it.
    // For this specific UI, it calculates rank from the imported mock list.
    // We'll leave rank as 0 or pass it from server if possible.
    $: rank = data.rank;

    // Pull-to-Refresh state
    let isRefreshing = false;
    let refreshError: string | null = null;

    async function handleRefresh() {
        isRefreshing = true;
        refreshError = null;

        try {
            await invalidateAll();
            await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
            console.error("Failed to refresh trader detail:", error);
            refreshError = "ไม่สามารถอัปเดตข้อมูลเทรดเดอร์ได้ในขณะนี้";
        } finally {
            isRefreshing = false;
        }
    }

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
    let chartModalLoading = false;
    let chartModalError: string | null = null;
    let chartHasData = false;
    let chartModalEmpty = false;

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
    let showExportMenu = false;

    // Sidebar tab state
    let activeTab: 'overview' | 'style' = 'overview';

    // Filter State
    let filterSymbol = "ALL";
    let filterType = "ALL";
    let filterOutcome = "ALL";

    $: uniqueSymbols = trader
        ? ["ALL", ...new Set(trader.history.map((t: any) => t.symbol))].sort()
        : ["ALL"];

    // Session performance data
    $: sessionData = trader ? [
        { name: 'Asia', time: '00:00–08:00 UTC', profit: trader.stats.sessionAsianProfit || 0, winRate: trader.stats.sessionAsianWinRate || 0, bgClass: 'bg-blue-500', textClass: 'text-blue-600 dark:text-blue-400', barColor: 'rgba(59,130,246,0.2)' },
        { name: 'London', time: '07:00–16:00 UTC', profit: trader.stats.sessionLondonProfit || 0, winRate: trader.stats.sessionLondonWinRate || 0, bgClass: 'bg-purple-500', textClass: 'text-purple-600 dark:text-purple-400', barColor: 'rgba(168,85,247,0.2)' },
        { name: 'New York', time: '12:00–21:00 UTC', profit: trader.stats.sessionNewYorkProfit || 0, winRate: trader.stats.sessionNewYorkWinRate || 0, bgClass: 'bg-orange-500', textClass: 'text-orange-600 dark:text-orange-400', barColor: 'rgba(249,115,22,0.2)' }
    ] : [];
    $: maxAbsProfit = Math.max(...sessionData.map(s => Math.abs(s.profit)), 1);

    // Sorting State
    let sortColumn: "symbol" | "type" | "lot" | "profit" | "closeTime" =
        "closeTime";
    let sortDirection: "asc" | "desc" = "desc";

    function handleSort(
        column: "symbol" | "type" | "lot" | "profit" | "closeTime",
    ) {
        if (sortColumn === column) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortColumn = column;
            sortDirection =
                column === "symbol" || column === "type" ? "asc" : "desc";
        }
    }

    $: filteredHistory = trader
        ? trader.history.filter((trade: any) => {
              const matchSymbol =
                  filterSymbol === "ALL" || trade.symbol === filterSymbol;
              const matchType =
                  filterType === "ALL" || trade.type === filterType;
              const matchOutcome =
                  filterOutcome === "ALL" ||
                  (filterOutcome === "WIN" && trade.profit >= 0) ||
                  (filterOutcome === "LOSS" && trade.profit < 0);

              return matchSymbol && matchType && matchOutcome;
          })
        : [];

    $: sortedHistory = [...filteredHistory].sort((a: any, b: any) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];

        // Handle date comparison
        if (sortColumn === "closeTime") {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        // Handle string comparison
        if (typeof valA === "string" && typeof valB === "string") {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

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
        isResizing: false,
        resizingHandle: null,
        startPoint: null,
        currentPoint: null,
        selectedId: null,
        hoveredId: null,
        hoveredHandle: null,
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
            const entryTime =
                new Date(selectedTrade.openTime).getTime() / 1000 +
                THAILAND_OFFSET_SECONDS;

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
        currentTimeframe = 15;
        baseM1Data = [];
        chartModalLoading = true;
        chartModalError = null;
        chartModalEmpty = false;
        chartHasData = false;

        if (chart) {
            chart.remove();
            chart = null;
        }

        await tick();
        await new Promise((resolve) => setTimeout(resolve, 80));

        if (!chartContainerRef) {
            chartModalLoading = false;
            chartModalError = "ไม่สามารถเปิดหน้าต่างกราฟได้ในขณะนี้";
            return;
        }

        try {
            const openTime = new Date(trade.openTime).getTime();
            const closeTime = new Date(trade.closeTime).getTime();
            const buffer = 12 * 60 * 60 * 1000;

            const from = new Date(openTime - buffer).toISOString();
            const to = new Date(closeTime + buffer).toISOString();

            const res = await fetch(
                `/api/candles?symbol=${trade.symbol}&from=${from}&to=${to}&timeframe=M1`,
            );
            const payload = await res.json();

            if (!res.ok || payload?.error) {
                throw new Error(
                    payload?.error?.message ||
                        payload?.error ||
                        "โหลดข้อมูลกราฟราคาไม่สำเร็จ",
                );
            }

            if (!payload.length) {
                chartModalEmpty = true;
                return;
            }

            const isDark = document.documentElement.classList.contains('dark');
            const chartColors = getChartColors(isDark);

            chart = createChart(chartContainerRef, {
                layout: {
                    background: { type: ColorType.Solid, color: isDark ? "#111827" : "#ffffff" },
                    textColor: chartColors.textColor,
                },
                grid: {
                    vertLines: { color: chartColors.gridColor },
                    horzLines: { color: chartColors.gridColor },
                },
                width: chartContainerRef.clientWidth,
                height: 400,
                timeScale: {
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
                localization: {
                    timeFormatter: (timestamp: number) => {
                        // Data already has Thailand offset, so use UTC to display correctly
                        const date = new Date(timestamp * 1000);
                        const day = date
                            .getUTCDate()
                            .toString()
                            .padStart(2, "0");
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
            baseM1Data = payload.map((c: any) => ({
                time: new Date(c.time).getTime() / 1000 + THAILAND_OFFSET_SECONDS,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }));

            const chartData = resampleData(baseM1Data, 15);

            if (!chartData.length) {
                chartModalEmpty = true;
                chart.remove();
                chart = null;
                return;
            }

            candlestickSeries.setData(chartData);

            const entryTime =
                new Date(trade.openTime).getTime() / 1000 + THAILAND_OFFSET_SECONDS;
            const exitTime =
                new Date(trade.closeTime).getTime() / 1000 + THAILAND_OFFSET_SECONDS;

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

            const entryStartTime = findNearestTime(entryTime);

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
            initDrawingManager();
            chartHasData = true;
        } catch (error) {
            console.error("Failed to open trade chart:", error);
            chartModalError =
                error instanceof Error
                    ? error.message
                    : "โหลดข้อมูลกราฟราคาไม่สำเร็จ";
            chartHasData = false;

            if (chart) {
                chart.remove();
                chart = null;
            }
        } finally {
            chartModalLoading = false;
        }
    }

    function closeChartModal() {
        showChartModal = false;
        selectedTrade = null;
        chartModalLoading = false;
        chartModalError = null;
        chartModalEmpty = false;
        chartHasData = false;
        if (chart) {
            chart.remove();
            chart = null;
        }
    }

    // Share & Export
    let showCopiedToast = false;

    function exportCSV() {
        if (!trader) return;
        const headers = ['Symbol','Type','Lot','Open Price','Close Price','Open Time','Close Time','Profit','SL','TP'];
        const rows = trader.history.map((t: any) => [
            t.symbol, t.type, t.lot, t.openPrice, t.closePrice, t.openTime, t.closeTime, t.profit, t.sl ?? '', t.tp ?? ''
        ]);
        const csv = [headers, ...rows].map((r: any[]) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${trader.nickname}_trades.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function shareTrader() {
        if (!trader) return;
        const shareData = {
            title: `${trader.nickname} | EliteGold Competition`,
            text: `Rank #${rank} | ${trader.points.toLocaleString()} points | $${formatMoney(trader.profit)} profit`,
            url: window.location.href
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (e) {
                // User cancelled or share failed, ignore
            }
        } else {
            await navigator.clipboard.writeText(window.location.href);
            showCopiedToast = true;
            setTimeout(() => { showCopiedToast = false; }, 2000);
        }
    }
</script>

<svelte:head>
    <title>{trader?.nickname || 'Trader'} | EliteGold Competition</title>
    <meta property="og:title" content="{trader?.nickname || 'Trader'} | EliteGold Competition" />
    <meta property="og:description" content="Rank #{rank} | {trader?.points?.toLocaleString() || 0} points | Win Rate: {trader?.stats?.winRate || 0}%" />
    <meta property="og:type" content="profile" />
    <meta name="twitter:card" content="summary" />
</svelte:head>

<PullToRefresh {isRefreshing} on:refresh={handleRefresh}>
    <div
        class="min-h-screen bg-gray-50 dark:bg-dark-bg py-4 px-3 sm:px-4 lg:px-6"
    >
        <div class="max-w-6xl mx-auto">
            <!-- Back -->
            <a
                href="/leaderboard"
                class="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3"
            >
                &larr; Leaderboard
            </a>

            <div class="mb-3 space-y-2">
                {#if isRefreshing}
                    <StatusBanner
                        tone="info"
                        compact
                        title={ASYNC_COPY.refreshing}
                        message="กำลังดึงข้อมูลล่าสุด โดยยังคงแสดงข้อมูลเดิมไว้"
                    />
                {/if}

                {#if refreshError}
                    <StatusBanner
                        tone="error"
                        title="อัปเดตข้อมูลไม่สำเร็จ"
                        message={refreshError}
                        actionLabel={ASYNC_COPY.retry}
                        on:action={handleRefresh}
                    />
                {/if}

                {#if data.isFallbackData}
                    <StatusBanner
                        tone="warning"
                        title={ASYNC_COPY.fallback}
                        message={data.loadError ||
                            "ข้อมูลล่าสุดโหลดไม่สำเร็จ จึงแสดงข้อมูลสำรองแทน"}
                    />
                {:else if data.loadError}
                    <StatusBanner
                        tone="error"
                        title="โหลดข้อมูลเทรดเดอร์ไม่สำเร็จ"
                        message={data.loadError}
                        actionLabel={ASYNC_COPY.retry}
                        on:action={handleRefresh}
                    />
                {/if}

                {#if data.partialFailures.length > 0}
                    <StatusBanner
                        tone="warning"
                        title="โหลดข้อมูลบางส่วนไม่สำเร็จ"
                        message={data.partialFailures.join(" • ")}
                    />
                {/if}
            </div>

            {#if isRefreshing && !trader}
                <TraderDetailSkeleton />
            {:else if !trader}
                <div class="text-center py-12">
                    <h2
                        class="text-2xl font-bold text-gray-900 dark:text-white"
                    >
                        Trader not found
                    </h2>
                    <p class="text-gray-500 dark:text-gray-400 mt-2">
                        The participant with ID {id} does not exist.
                    </p>
                </div>
            {:else}
                <!-- Header -->
                <div class="pb-3 mb-4 border-b border-gray-200 dark:border-dark-border">
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <h1 class="text-xl font-bold text-gray-900 dark:text-white truncate">
                                    {trader.nickname}
                                </h1>
                                <span class="text-sm font-medium text-gray-400 dark:text-gray-500 shrink-0">
                                    {getRankIcon(rank)}
                                </span>
                            </div>
                            <div class="flex items-center gap-3 mt-0.5">
                                <span class="text-xs text-gray-500 dark:text-gray-400">
                                    {trader.points.toLocaleString()} pts
                                </span>
                                <span class="text-sm font-mono font-semibold {trader.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    {trader.profit >= 0 ? "+" : ""}{formatMoney(trader.profit)}
                                </span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button
                                class="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                on:click={() => (showAiModal = true)}
                                title="AI Analysis"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </button>
                            <div class="relative">
                                <button
                                    class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
                                    on:click={shareTrader}
                                    title="Share"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                </button>
                                {#if showCopiedToast}
                                    <div class="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-50">
                                        Copied!
                                    </div>
                                {/if}
                            </div>
                            <div class="relative">
                                <button
                                    class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
                                    on:click={() => showExportMenu = !showExportMenu}
                                    title="Export"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                {#if showExportMenu}
                                    <div class="absolute right-0 top-full mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                                        <a
                                            href="/api/export?participant_id={id}&format=trades"
                                            download
                                            class="block px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg"
                                            on:click={() => showExportMenu = false}
                                        >
                                            Trades (CSV)
                                        </a>
                                        <a
                                            href="/api/export?participant_id={id}&format=stats"
                                            download
                                            class="block px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg"
                                            on:click={() => showExportMenu = false}
                                        >
                                            Daily Stats (CSV)
                                        </a>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Badges -->
                {#if badges.length > 0}
                    <div class="mb-4">
                        <BadgeList {badges} />
                    </div>
                {/if}

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- 1. Left Column: Equity Curve + Recent History -->
                    <div class="lg:col-span-2 space-y-4">
                        <div
                            class="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4"
                        >
                            <EquityChart
                                equitySnapshots={trader.equitySnapshots || []}
                                equityCurve={trader.equityCurve || []}
                            />
                        </div>

                        <!-- Trade History -->
                        <div
                            class="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden"
                        >
                            <div
                                class="px-4 py-3 border-b border-gray-100 dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
                                    Recent History
                                </h3>

                                <!-- Filters -->
                                <div class="flex flex-wrap items-center gap-2">

                                    <!-- Symbol Filter -->
                                    <div class="relative">
                                        <select
                                            bind:value={filterSymbol}
                                            class="appearance-none pl-2 pr-6 py-1 text-xs bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
                                        >
                                            {#each uniqueSymbols as symbol}
                                                <option value={symbol}
                                                    >{symbol === "ALL"
                                                        ? "All Symbols"
                                                        : symbol}</option
                                                >
                                            {/each}
                                        </select>
                                        <div
                                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"
                                        >
                                            <svg
                                                class="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                ><path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M19 9l-7 7-7-7"
                                                ></path></svg
                                            >
                                        </div>
                                    </div>

                                    <!-- Type Filter -->
                                    <div class="relative">
                                        <select
                                            bind:value={filterType}
                                            class="appearance-none pl-2 pr-6 py-1 text-xs bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
                                        >
                                            <option value="ALL"
                                                >All Types</option
                                            >
                                            <option value="BUY">Buy</option>
                                            <option value="SELL">Sell</option>
                                        </select>
                                        <div
                                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"
                                        >
                                            <svg
                                                class="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                ><path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M19 9l-7 7-7-7"
                                                ></path></svg
                                            >
                                        </div>
                                    </div>

                                    <!-- Outcome Filter -->
                                    <div class="relative">
                                        <select
                                            bind:value={filterOutcome}
                                            class="appearance-none pl-2 pr-6 py-1 text-xs bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
                                        >
                                            <option value="ALL"
                                                >All Outcomes</option
                                            >
                                            <option value="WIN">Win</option>
                                            <option value="LOSS">Loss</option>
                                        </select>
                                        <div
                                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"
                                        >
                                            <svg
                                                class="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                ><path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M19 9l-7 7-7-7"
                                                ></path></svg
                                            >
                                        </div>
                                    </div>

                                    {#if filterSymbol !== "ALL" || filterType !== "ALL" || filterOutcome !== "ALL"}
                                        <button
                                            on:click={() => { filterSymbol = "ALL"; filterType = "ALL"; filterOutcome = "ALL"; }}
                                            class="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    {/if}
                                </div>
                            </div>
                            <div class="overflow-x-auto">
                                <table
                                    class="w-full text-xs text-left text-gray-500 dark:text-gray-400"
                                >
                                    <thead
                                        class="text-[10px] text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-dark-surface"
                                    >
                                        <tr>
                                            {#each [
                                                { key: 'symbol', label: 'Symbol', align: '' },
                                                { key: 'type', label: 'Type', align: '' },
                                                { key: 'lot', label: 'Lot', align: 'text-right' },
                                                { key: 'profit', label: 'P/L', align: 'text-right' },
                                                { key: 'closeTime', label: 'Date/Time', align: 'text-right' }
                                            ] as col}
                                                <th class="px-3 py-2 {col.align}">
                                                    <button
                                                        on:click={() => handleSort(col.key as "symbol" | "type" | "lot" | "profit" | "closeTime")}
                                                        class="flex items-center gap-0.5 {col.align === 'text-right' ? 'ml-auto' : ''} hover:text-gray-800 dark:hover:text-gray-200"
                                                    >
                                                        {col.label}
                                                        <span class="text-gray-300 dark:text-gray-600">{sortColumn === col.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                                                    </button>
                                                </th>
                                            {/each}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#if sortedHistory.length === 0}
                                            <tr>
                                                <td colspan="5" class="px-3 py-6 text-center text-xs text-gray-400">
                                                    No trades match filters
                                                </td>
                                            </tr>
                                        {:else}
                                            {#each sortedHistory as trade}
                                                <tr
                                                    class="border-b border-gray-50 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-bg/30 cursor-pointer transition-colors"
                                                    on:click={() => openChart(trade)}
                                                >
                                                    <td class="px-3 py-2 font-medium text-gray-900 dark:text-white">{trade.symbol}</td>
                                                    <td class="px-3 py-2">
                                                        <span class="text-[10px] font-semibold {trade.type === 'BUY' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}">
                                                            {trade.type}
                                                        </span>
                                                    </td>
                                                    <td class="px-3 py-2 text-right tabular-nums">{trade.lot.toFixed(2)}</td>
                                                    <td class="px-3 py-2 text-right font-mono tabular-nums {trade.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}">
                                                        {trade.profit >= 0 ? "+" : ""}{trade.profit.toFixed(2)}
                                                    </td>
                                                    <td class="px-3 py-2 text-right text-[10px] text-gray-400">
                                                        {(() => {
                                                            const d = new Date(trade.closeTime);
                                                            const bkk = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
                                                            const dd = String(bkk.getDate()).padStart(2, "0");
                                                            const mm = String(bkk.getMonth() + 1).padStart(2, "0");
                                                            const hh = String(bkk.getHours()).padStart(2, "0");
                                                            const min = String(bkk.getMinutes()).padStart(2, "0");
                                                            return `${dd}/${mm} ${hh}:${min}`;
                                                        })()}
                                                    </td>
                                                </tr>
                                            {/each}
                                        {/if}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Sidebar Stats -->
                    <div class="lg:col-span-1 space-y-4 h-fit order-first lg:order-last">
                        <!-- Tabbed Stats Card -->
                        <div class="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
                            <!-- Tab buttons -->
                            <div class="flex border-b border-gray-200 dark:border-dark-border">
                                <button
                                    on:click={() => activeTab = 'overview'}
                                    class="flex-1 py-2 text-xs font-medium transition-colors
                                        {activeTab === 'overview'
                                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
                                >
                                    Overview
                                </button>
                                <button
                                    on:click={() => activeTab = 'style'}
                                    class="flex-1 py-2 text-xs font-medium transition-colors
                                        {activeTab === 'style'
                                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
                                >
                                    Style
                                </button>
                            </div>

                            <div class="p-4">
                                {#if activeTab === 'overview'}
                                    <!-- Win Rate -->
                                    <div class="mb-3">
                                        <div class="flex justify-between text-xs mb-1">
                                            <span class="text-gray-500 dark:text-gray-400">Win Rate</span>
                                            <span class="font-medium text-gray-900 dark:text-white">{Number(trader.stats.winRate).toFixed(1)}%</span>
                                        </div>
                                        <div class="w-full bg-gray-100 dark:bg-dark-border rounded-full h-1 overflow-hidden">
                                            <div class="bg-blue-500 h-1 rounded-full" style="width: {trader.stats.winRate}%"></div>
                                        </div>
                                        <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                                            <span>Long {Number(trader.stats.winRateBuy).toFixed(0)}%</span>
                                            <span>Short {Number(trader.stats.winRateSell).toFixed(0)}%</span>
                                        </div>
                                    </div>

                                    <!-- Stats Grid -->
                                    <div class="grid grid-cols-3 gap-x-3 gap-y-2.5 mb-4">
                                        {#each [
                                            { label: 'PF', value: trader.stats.profitFactor, color: '' },
                                            { label: 'Max DD', value: `${trader.stats.maxDrawdown}%`, color: 'text-red-500' },
                                            { label: 'Trades', value: trader.stats.totalTrades, color: '' },
                                            { label: 'RR', value: trader.stats.rrRatio, color: trader.stats.rrRatio >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-500' },
                                            { label: 'Avg Win', value: `$${trader.stats.avgWin}`, color: 'text-green-600 dark:text-green-400' },
                                            { label: 'Avg Loss', value: `$${trader.stats.avgLoss}`, color: 'text-red-500' },
                                            { label: 'Best', value: `+$${formatMoney(trader.stats.bestTrade)}`, color: 'text-green-600 dark:text-green-400' },
                                            { label: 'Worst', value: `${trader.stats.worstTrade >= 0 ? '+' : ''}$${formatMoney(trader.stats.worstTrade)}`, color: trader.stats.worstTrade >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500' },
                                            { label: 'W/L Streak', value: `${trader.stats.maxConsecutiveWins}/${trader.stats.maxConsecutiveLosses}`, color: '' }
                                        ] as stat}
                                            <div>
                                                <div class="text-[10px] text-gray-400 dark:text-gray-500">{stat.label}</div>
                                                <div class="text-sm font-semibold tabular-nums {stat.color || 'text-gray-900 dark:text-white'}">{stat.value}</div>
                                            </div>
                                        {/each}
                                    </div>

                                    <!-- Sessions -->
                                    <div class="border-t border-gray-100 dark:border-dark-border pt-3">
                                        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Sessions</div>
                                        <div class="space-y-2">
                                            {#each sessionData as session}
                                                {@const barWidth = Math.abs(session.profit) / maxAbsProfit * 100}
                                                <div class="flex items-center gap-2">
                                                    <div class="w-12 text-[10px] font-medium {session.textClass} shrink-0">{session.name}</div>
                                                    <div class="flex-1 h-4 bg-gray-100 dark:bg-dark-bg/50 rounded overflow-hidden">
                                                        <div class="h-full rounded {session.profit >= 0 ? 'bg-green-500/25' : 'bg-red-500/25'}" style="width: {barWidth}%"></div>
                                                    </div>
                                                    <div class="w-16 text-right text-[10px] font-mono tabular-nums shrink-0 {session.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}">
                                                        {session.profit >= 0 ? '+' : ''}{Number(session.profit).toFixed(0)}
                                                    </div>
                                                    <div class="w-10 text-right text-[10px] font-mono tabular-nums text-gray-400 shrink-0">
                                                        {Number(session.winRate).toFixed(0)}%
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                {:else}
                                    <!-- Style tab: Trading Style + Holding Times -->
                                    <div class="text-sm font-semibold text-gray-900 dark:text-white mb-3">{trader.stats.tradingStyle}</div>
                                    <div class="space-y-1.5">
                                        {#each [
                                            { label: 'Favorite', value: trader.stats.favoritePair, color: '' },
                                            { label: 'Avg Hold', value: trader.stats.avgHoldingTime, color: '' },
                                            { label: 'Hold (Win)', value: trader.stats.avgHoldingTimeWin, color: 'text-green-600 dark:text-green-400' },
                                            { label: 'Hold (Loss)', value: trader.stats.avgHoldingTimeLoss, color: 'text-red-500' }
                                        ] as row}
                                            <div class="flex items-center justify-between text-xs">
                                                <span class="text-gray-400">{row.label}</span>
                                                <span class="font-medium {row.color || 'text-gray-900 dark:text-white'}">{row.value}</span>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- Points Breakdown -->
                        <div>
                            <ScoreBreakdown
                                totalPoints={trader.points}
                                totalTrades={trader.stats.totalTrades}
                                sessionAsianProfit={trader.stats.sessionAsianProfit}
                                sessionLondonProfit={trader.stats.sessionLondonProfit}
                                sessionNewYorkProfit={trader.stats.sessionNewYorkProfit}
                                bestTrade={trader.stats.bestTrade}
                                worstTrade={trader.stats.worstTrade}
                            />
                        </div>

                        <RecentRhythmCard
                            dailyHistory={trader.dailyHistory || []}
                            history={trader.history || []}
                        />

                    </div>
                </div>

                <!-- Trading Calendar (full width) -->
                <div class="mt-4">
                    <TradingCalendar dailyData={trader.dailyHistory || []} />
                </div>

                <!-- Advanced Analytics -->
                {#if analytics}
                    <div class="mt-4">
                        <h2 class="text-sm font-bold text-gray-900 dark:text-white mb-3">
                            Advanced Analytics
                        </h2>
                        <AnalyticsDashboard {analytics} />
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</PullToRefresh>

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
                            {
                                timeZone: "Asia/Bangkok",
                            },
                        )}
                    </p>
                    <p class="text-xs text-gray-400">
                        Close: {new Date(
                            selectedTrade?.closeTime,
                        ).toLocaleString("th-TH", {
                            timeZone: "Asia/Bangkok",
                        })}
                    </p>
                </div>

                <!-- Timeframe Dropdown -->
                <div class="flex items-center gap-2">
                    <select
                        bind:value={currentTimeframe}
                        on:change={() => updateChartTimeframe(currentTimeframe)}
                        disabled={!chartHasData || chartModalLoading}
                        class="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {#each timeframes as tf}
                            <option value={tf.value}>{tf.label}</option>
                        {/each}
                    </select>

                    <!-- Fullscreen Toggle -->
                    <button
                        on:click={toggleFullscreen}
                        disabled={!chartHasData}
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
                        aria-label="Close chart modal"
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
            {#if chartHasData}
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
            {/if}

            <!-- Chart Container -->
            <div class="p-4 bg-gray-900 {isFullscreen ? 'flex-1' : ''}">
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <div
                    class="relative w-full {isFullscreen
                        ? 'h-full'
                        : 'h-[400px]'}"
                    role="application"
                    style="touch-action: none; cursor: {chartHasData
                        ? chartCursor
                        : 'default'};"
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

                    {#if chartHasData}
                        <DrawingOverlay
                            {chart}
                            series={candlestickSeries}
                            {drawings}
                            {drawingState}
                        />
                    {/if}

                    {#if chartModalLoading}
                        <div
                            class="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-gray-900/80 text-gray-200"
                        >
                            <div class="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500"></div>
                            <p class="text-sm">{ASYNC_COPY.loading}</p>
                        </div>
                    {:else if chartModalError}
                        <div
                            class="absolute inset-0 flex items-center justify-center p-6"
                        >
                            <div class="w-full max-w-md">
                                <StatusBanner
                                    tone="error"
                                    title="โหลดกราฟราคาไม่สำเร็จ"
                                    message={chartModalError}
                                    actionLabel={ASYNC_COPY.retry}
                                    on:action={() =>
                                        selectedTrade && openChart(selectedTrade)}
                                />
                            </div>
                        </div>
                    {:else if chartModalEmpty}
                        <div
                            class="absolute inset-0 flex items-center justify-center p-6"
                        >
                            <div class="w-full max-w-md">
                                <StatusBanner
                                    tone="warning"
                                    title="ไม่มีข้อมูลกราฟราคา"
                                    message="ไม่พบข้อมูลตลาดสำหรับช่วงเวลาของดีลนี้"
                                />
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            {#if chartHasData}
                <div
                    class="p-4 bg-gray-50 dark:bg-dark-bg/50 flex gap-4 text-sm"
                >
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
            {/if}
        </div>
    </div>
{/if}

<!-- AI Analysis Modal -->
<AiAnalysisModal
    bind:show={showAiModal}
    trader={{ ...trader, rank }}
    on:close={() => (showAiModal = false)}
/>
