<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import type {
        Drawing,
        DrawingTool,
        Point,
        DrawingState,
    } from "./DrawingManager";

    // Props
    export let chart: any;
    export let series: any;
    export let drawings: Drawing[] = [];
    export let drawingState: DrawingState;

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
        preview: "rgba(156, 163, 175, 0.8)",
        selected: "#60A5FA",
        hover: "rgba(96, 165, 250, 0.3)",
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

    function chartToScreen(point: Point): { x: number; y: number } | null {
        if (!chart || !series) return null;
        const x = chart.timeScale().timeToCoordinate(point.time);
        const y = series.priceToCoordinate(point.price);
        if (x === null || y === null) return null;
        return { x, y };
    }

    function render() {
        if (!ctx || !canvasRef) {
            animationId = requestAnimationFrame(render);
            return;
        }

        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

        // Render all drawings
        for (const drawing of drawings) {
            if (!drawing.visible) continue;
            renderDrawing(drawing);
        }

        // Render preview if drawing
        if (
            drawingState?.isDrawing &&
            drawingState.rawStartScreen &&
            drawingState.rawCurrentScreen
        ) {
            // Use raw screen coordinates for smooth preview (avoids time snapping)
            renderPreviewFromScreen(
                drawingState.rawStartScreen,
                drawingState.rawCurrentScreen,
                drawingState.tool,
            );
        }

        animationId = requestAnimationFrame(render);
    }

    function renderDrawing(drawing: Drawing) {
        const isSelected = drawing.selected;
        const isHovered = drawingState?.hoveredId === drawing.id;

        switch (drawing.type) {
            case "trendline":
                renderTrendLine(drawing, isSelected, isHovered);
                break;
            case "hline":
                renderHorizontalLine(drawing, isSelected, isHovered);
                break;
            case "fib":
                renderFibonacci(drawing, isSelected, isHovered);
                break;
            case "rect":
                renderRectangle(drawing, isSelected, isHovered);
                break;
        }
    }

    function renderTrendLine(
        drawing: any,
        isSelected: boolean,
        isHovered: boolean,
    ) {
        const start = chartToScreen(drawing.start);
        const end = chartToScreen(drawing.end);
        if (!start || !end) return;

        // Hover highlight
        if (isHovered && !isSelected) {
            ctx!.beginPath();
            ctx!.strokeStyle = COLORS.hover;
            ctx!.lineWidth = 8;
            ctx!.moveTo(start.x, start.y);
            ctx!.lineTo(end.x, end.y);
            ctx!.stroke();
        }

        // Main line
        ctx!.beginPath();
        ctx!.strokeStyle = isSelected ? COLORS.selected : drawing.color;
        ctx!.lineWidth = isSelected ? 3 : 2;
        ctx!.moveTo(start.x, start.y);
        ctx!.lineTo(end.x, end.y);
        ctx!.stroke();

        // Endpoints
        const pointSize = isSelected ? 6 : 4;
        drawCircle(
            start.x,
            start.y,
            pointSize,
            isSelected ? COLORS.selected : drawing.color,
            isSelected,
        );
        drawCircle(
            end.x,
            end.y,
            pointSize,
            isSelected ? COLORS.selected : drawing.color,
            isSelected,
        );
    }

    function renderHorizontalLine(
        drawing: any,
        isSelected: boolean,
        isHovered: boolean,
    ) {
        const y = series.priceToCoordinate(drawing.price);
        if (y === null) return;

        // Hover highlight
        if (isHovered && !isSelected) {
            ctx!.beginPath();
            ctx!.strokeStyle = COLORS.hover;
            ctx!.lineWidth = 10;
            ctx!.moveTo(0, y);
            ctx!.lineTo(canvasRef.width, y);
            ctx!.stroke();
        }

        ctx!.beginPath();
        ctx!.strokeStyle = isSelected ? COLORS.selected : drawing.color;
        ctx!.lineWidth = isSelected ? 2 : 1;
        ctx!.setLineDash([5, 5]);
        ctx!.moveTo(0, y);
        ctx!.lineTo(canvasRef.width, y);
        ctx!.stroke();
        ctx!.setLineDash([]);

        // Price label with background
        const label = drawing.price.toFixed(2);
        const labelWidth = ctx!.measureText(label).width + 8;
        ctx!.fillStyle = isSelected ? COLORS.selected : drawing.color;
        ctx!.fillRect(canvasRef.width - labelWidth - 2, y - 10, labelWidth, 20);
        ctx!.fillStyle = "#111827";
        ctx!.font = "bold 11px monospace";
        ctx!.fillText(label, canvasRef.width - labelWidth + 2, y + 4);
    }

    function renderFibonacci(
        drawing: any,
        isSelected: boolean,
        isHovered: boolean,
    ) {
        const start = chartToScreen(drawing.start);
        const end = chartToScreen(drawing.end);
        if (!start || !end) return;

        const highPrice = Math.max(drawing.start.price, drawing.end.price);
        const lowPrice = Math.min(drawing.start.price, drawing.end.price);
        const range = highPrice - lowPrice;
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const width = maxX - minX;

        // Background highlight when hovered
        if (isHovered && !isSelected) {
            ctx!.fillStyle = "rgba(139, 92, 246, 0.05)";
            ctx!.fillRect(
                minX,
                Math.min(start.y, end.y),
                width,
                Math.abs(end.y - start.y),
            );
        }

        ctx!.font = "10px monospace";

        for (let i = 0; i < FIB_LEVELS.length; i++) {
            const level = FIB_LEVELS[i];
            const price = highPrice - range * level;
            const y = series.priceToCoordinate(price);
            if (y === null) continue;

            // Fill between levels
            if (i < FIB_LEVELS.length - 1) {
                const nextPrice = highPrice - range * FIB_LEVELS[i + 1];
                const nextY = series.priceToCoordinate(nextPrice);
                if (nextY !== null) {
                    ctx!.fillStyle = `${FIB_COLORS[i]}10`;
                    ctx!.fillRect(minX, y, width, nextY - y);
                }
            }

            ctx!.beginPath();
            ctx!.strokeStyle = isSelected ? COLORS.selected : FIB_COLORS[i];
            ctx!.lineWidth = level === 0.5 || level === 0.618 ? 2 : 1;
            ctx!.setLineDash(level === 0 || level === 1 ? [] : [3, 3]);
            ctx!.moveTo(minX, y);
            ctx!.lineTo(maxX, y);
            ctx!.stroke();
            ctx!.setLineDash([]);

            // Label
            ctx!.fillStyle = FIB_COLORS[i];
            ctx!.fillText(`${(level * 100).toFixed(1)}%`, minX + 5, y - 3);
            ctx!.fillStyle = "#9CA3AF";
            ctx!.fillText(price.toFixed(2), minX + 45, y - 3);
        }

        // Control points when selected
        if (isSelected) {
            drawCircle(start.x, start.y, 6, COLORS.selected, true);
            drawCircle(end.x, end.y, 6, COLORS.selected, true);
        }
    }

    function renderRectangle(
        drawing: any,
        isSelected: boolean,
        isHovered: boolean,
    ) {
        const start = chartToScreen(drawing.start);
        const end = chartToScreen(drawing.end);
        if (!start || !end) return;

        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);

        // Fill
        ctx!.fillStyle = isHovered
            ? "rgba(16, 185, 129, 0.25)"
            : drawing.fillColor;
        ctx!.fillRect(x, y, width, height);

        // Border
        ctx!.beginPath();
        ctx!.strokeStyle = isSelected ? COLORS.selected : drawing.color;
        ctx!.lineWidth = isSelected ? 2 : 1;
        ctx!.strokeRect(x, y, width, height);

        // Control points when selected
        if (isSelected) {
            drawCircle(start.x, start.y, 5, COLORS.selected, true);
            drawCircle(end.x, end.y, 5, COLORS.selected, true);
            drawCircle(start.x, end.y, 5, COLORS.selected, true);
            drawCircle(end.x, start.y, 5, COLORS.selected, true);
        }
    }

    function renderPreview(start: Point, end: Point, tool: DrawingTool) {
        const startScreen = chartToScreen(start);
        const endScreen = chartToScreen(end);
        if (!startScreen || !endScreen) return;

        ctx!.globalAlpha = 0.7;
        ctx!.setLineDash([5, 5]);

        switch (tool) {
            case "trendline":
                ctx!.beginPath();
                ctx!.strokeStyle = COLORS.trendline;
                ctx!.lineWidth = 2;
                ctx!.moveTo(startScreen.x, startScreen.y);
                ctx!.lineTo(endScreen.x, endScreen.y);
                ctx!.stroke();
                break;
            case "fib":
            case "rect":
                const x = Math.min(startScreen.x, endScreen.x);
                const y = Math.min(startScreen.y, endScreen.y);
                const width = Math.abs(endScreen.x - startScreen.x);
                const height = Math.abs(endScreen.y - startScreen.y);
                ctx!.strokeStyle = tool === "fib" ? COLORS.fib : COLORS.rect;
                ctx!.lineWidth = 2;
                ctx!.strokeRect(x, y, width, height);
                break;
        }

        ctx!.setLineDash([]);
        ctx!.globalAlpha = 1;

        // Start point indicator
        drawCircle(startScreen.x, startScreen.y, 6, "#60A5FA", true);
    }

    // Render preview using raw screen coordinates (avoids time snapping to candles)
    function renderPreviewFromScreen(
        startScreen: { x: number; y: number },
        endScreen: { x: number; y: number },
        tool: DrawingTool,
    ) {
        ctx!.globalAlpha = 0.7;
        ctx!.setLineDash([5, 5]);

        switch (tool) {
            case "trendline":
                ctx!.beginPath();
                ctx!.strokeStyle = COLORS.trendline;
                ctx!.lineWidth = 2;
                ctx!.moveTo(startScreen.x, startScreen.y);
                ctx!.lineTo(endScreen.x, endScreen.y);
                ctx!.stroke();
                break;
            case "fib":
            case "rect":
                const x = Math.min(startScreen.x, endScreen.x);
                const y = Math.min(startScreen.y, endScreen.y);
                const width = Math.abs(endScreen.x - startScreen.x);
                const height = Math.abs(endScreen.y - startScreen.y);
                ctx!.strokeStyle = tool === "fib" ? COLORS.fib : COLORS.rect;
                ctx!.lineWidth = 2;
                ctx!.strokeRect(x, y, width, height);
                break;
        }

        ctx!.setLineDash([]);
        ctx!.globalAlpha = 1;

        // Start point indicator
        drawCircle(startScreen.x, startScreen.y, 6, "#60A5FA", true);
    }

    function drawCircle(
        x: number,
        y: number,
        radius: number,
        color: string,
        filled: boolean = true,
    ) {
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        if (filled) {
            ctx!.fillStyle = color;
            ctx!.fill();
        }
        ctx!.strokeStyle = "#1F2937";
        ctx!.lineWidth = 2;
        ctx!.stroke();
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

            const resizeObserver = new ResizeObserver(resizeCanvas);
            if (canvasRef.parentElement) {
                resizeObserver.observe(canvasRef.parentElement);
            }

            return () => resizeObserver.disconnect();
        }
    });

    onDestroy(() => {
        if (animationId) cancelAnimationFrame(animationId);
    });
</script>

<canvas
    bind:this={canvasRef}
    class="absolute inset-0 pointer-events-none z-10"
    style="width: 100%; height: 100%;"
></canvas>
