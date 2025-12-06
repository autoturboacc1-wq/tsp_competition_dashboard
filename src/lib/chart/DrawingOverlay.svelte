<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import type { Drawing, DrawingTool, Point } from "./DrawingManager";

    // Props
    export let chart: any;
    export let series: any;
    export let drawings: Drawing[] = [];
    export let activeTool: DrawingTool = "none";
    export let pendingStart: Point | null = null;
    export let mousePosition: Point | null = null;

    const dispatch = createEventDispatcher();

    let canvasRef: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let animationId: number;

    // Colors
    const COLORS = {
        trendline: "#3B82F6",
        hline: "#FBBF24",
        fib: "#8B5CF6",
        rect: "#10B981",
        preview: "#9CA3AF",
    };

    const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const FIB_COLORS = [
        "#EF4444",
        "#F59E0B",
        "#EAB308",
        "#84CC16",
        "#22C55E",
        "#14B8A6",
        "#3B82F6",
    ];

    // Convert chart coordinates to screen coordinates
    function chartToScreen(point: Point): { x: number; y: number } | null {
        if (!chart || !series) return null;

        const x = chart.timeScale().timeToCoordinate(point.time);
        const y = series.priceToCoordinate(point.price);

        if (x === null || y === null) return null;
        return { x, y };
    }

    function render() {
        if (!ctx || !canvasRef) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

        // Render all drawings
        for (const drawing of drawings) {
            if (!drawing.visible) continue;

            switch (drawing.type) {
                case "trendline":
                    renderTrendLine(drawing);
                    break;
                case "hline":
                    renderHorizontalLine(drawing);
                    break;
                case "fib":
                    renderFibonacci(drawing);
                    break;
                case "rect":
                    renderRectangle(drawing);
                    break;
            }
        }

        // Render preview if drawing
        if (activeTool !== "none" && pendingStart && mousePosition) {
            renderPreview(pendingStart, mousePosition);
        }

        animationId = requestAnimationFrame(render);
    }

    function renderTrendLine(drawing: any) {
        const start = chartToScreen(drawing.start);
        const end = chartToScreen(drawing.end);
        if (!start || !end) return;

        ctx!.beginPath();
        ctx!.strokeStyle = drawing.color;
        ctx!.lineWidth = 2;
        ctx!.moveTo(start.x, start.y);
        ctx!.lineTo(end.x, end.y);
        ctx!.stroke();

        // Draw endpoints
        drawCircle(start.x, start.y, 4, drawing.color);
        drawCircle(end.x, end.y, 4, drawing.color);
    }

    function renderHorizontalLine(drawing: any) {
        const y = series.priceToCoordinate(drawing.price);
        if (y === null) return;

        ctx!.beginPath();
        ctx!.strokeStyle = drawing.color;
        ctx!.lineWidth = 1;
        ctx!.setLineDash([5, 5]);
        ctx!.moveTo(0, y);
        ctx!.lineTo(canvasRef.width, y);
        ctx!.stroke();
        ctx!.setLineDash([]);

        // Price label
        ctx!.fillStyle = drawing.color;
        ctx!.font = "11px monospace";
        ctx!.fillText(drawing.price.toFixed(2), 5, y - 5);
    }

    function renderFibonacci(drawing: any) {
        const start = chartToScreen(drawing.start);
        const end = chartToScreen(drawing.end);
        if (!start || !end) return;

        const highPrice = Math.max(drawing.start.price, drawing.end.price);
        const lowPrice = Math.min(drawing.start.price, drawing.end.price);
        const range = highPrice - lowPrice;

        ctx!.font = "10px monospace";

        for (let i = 0; i < FIB_LEVELS.length; i++) {
            const level = FIB_LEVELS[i];
            const price = highPrice - range * level;
            const y = series.priceToCoordinate(price);
            if (y === null) continue;

            ctx!.beginPath();
            ctx!.strokeStyle = FIB_COLORS[i];
            ctx!.lineWidth = 1;
            ctx!.setLineDash(level === 0.5 ? [] : [3, 3]);
            ctx!.moveTo(Math.min(start.x, end.x), y);
            ctx!.lineTo(Math.max(start.x, end.x), y);
            ctx!.stroke();
            ctx!.setLineDash([]);

            // Label
            ctx!.fillStyle = FIB_COLORS[i];
            const label = `${(level * 100).toFixed(1)}% (${price.toFixed(2)})`;
            ctx!.fillText(label, Math.min(start.x, end.x) + 5, y - 3);
        }

        // Trend line connecting the points
        ctx!.beginPath();
        ctx!.strokeStyle = COLORS.fib;
        ctx!.lineWidth = 1;
        ctx!.setLineDash([2, 2]);
        ctx!.moveTo(start.x, start.y);
        ctx!.lineTo(end.x, end.y);
        ctx!.stroke();
        ctx!.setLineDash([]);
    }

    function renderRectangle(drawing: any) {
        const start = chartToScreen(drawing.start);
        const end = chartToScreen(drawing.end);
        if (!start || !end) return;

        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);

        // Fill
        ctx!.fillStyle = drawing.fillColor || "rgba(16, 185, 129, 0.1)";
        ctx!.fillRect(x, y, width, height);

        // Border
        ctx!.beginPath();
        ctx!.strokeStyle = drawing.color;
        ctx!.lineWidth = 1;
        ctx!.strokeRect(x, y, width, height);
    }

    function renderPreview(start: Point, end: Point) {
        const startScreen = chartToScreen(start);
        const endScreen = chartToScreen(end);
        if (!startScreen || !endScreen) return;

        ctx!.globalAlpha = 0.6;

        switch (activeTool) {
            case "trendline":
                ctx!.beginPath();
                ctx!.strokeStyle = COLORS.preview;
                ctx!.lineWidth = 2;
                ctx!.setLineDash([5, 5]);
                ctx!.moveTo(startScreen.x, startScreen.y);
                ctx!.lineTo(endScreen.x, endScreen.y);
                ctx!.stroke();
                ctx!.setLineDash([]);
                break;
            case "fib":
            case "rect":
                const x = Math.min(startScreen.x, endScreen.x);
                const y = Math.min(startScreen.y, endScreen.y);
                const width = Math.abs(endScreen.x - startScreen.x);
                const height = Math.abs(endScreen.y - startScreen.y);
                ctx!.strokeStyle = COLORS.preview;
                ctx!.lineWidth = 1;
                ctx!.setLineDash([5, 5]);
                ctx!.strokeRect(x, y, width, height);
                ctx!.setLineDash([]);
                break;
        }

        ctx!.globalAlpha = 1;

        // Start point indicator
        drawCircle(startScreen.x, startScreen.y, 5, "#60A5FA");
    }

    function drawCircle(x: number, y: number, radius: number, color: string) {
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.fill();
    }

    function resizeCanvas() {
        if (!canvasRef) return;
        const rect = canvasRef.parentElement?.getBoundingClientRect();
        if (rect) {
            canvasRef.width = rect.width;
            canvasRef.height = rect.height;
        }
    }

    onMount(() => {
        if (canvasRef) {
            ctx = canvasRef.getContext("2d");
            resizeCanvas();
            render();

            // Listen for chart changes
            const resizeObserver = new ResizeObserver(resizeCanvas);
            if (canvasRef.parentElement) {
                resizeObserver.observe(canvasRef.parentElement);
            }

            return () => {
                resizeObserver.disconnect();
            };
        }
    });

    onDestroy(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });

    // Re-render when drawings change
    $: if (drawings || pendingStart || mousePosition) {
        // Trigger re-render
    }
</script>

<canvas
    bind:this={canvasRef}
    class="absolute inset-0 pointer-events-none z-10"
    style="width: 100%; height: 100%;"
></canvas>
