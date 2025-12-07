// Drawing Types
export interface Point {
    time: number;
    price: number;
}

export interface ScreenPoint {
    x: number;
    y: number;
}

export interface DrawingBase {
    id: string;
    type: 'trendline' | 'hline' | 'fib' | 'rect';
    color: string;
    visible: boolean;
    selected?: boolean;
}

export interface TrendLineDrawing extends DrawingBase {
    type: 'trendline';
    start: Point;
    end: Point;
}

export interface HorizontalLineDrawing extends DrawingBase {
    type: 'hline';
    price: number;
}

export interface FibRetracementDrawing extends DrawingBase {
    type: 'fib';
    start: Point;
    end: Point;
    levels: number[];
}

export interface RectangleDrawing extends DrawingBase {
    type: 'rect';
    start: Point;
    end: Point;
    fillColor: string;
}

export type Drawing = TrendLineDrawing | HorizontalLineDrawing | FibRetracementDrawing | RectangleDrawing;

export type DrawingTool = 'none' | 'trendline' | 'hline' | 'fib' | 'rect' | 'select';

export type InteractionMode = 'idle' | 'drawing' | 'moving' | 'resizing';

export type CursorStyle = 'default' | 'crosshair' | 'move' | 'pointer' | 'grab' | 'grabbing';

// Drawing State for TradingView-style interaction
export interface DrawingState {
    tool: DrawingTool;
    mode: InteractionMode;
    isDrawing: boolean;
    isDragging: boolean;
    isResizing: boolean;  // NEW: resizing a drawing endpoint
    resizingHandle: 'start' | 'end' | null;  // NEW: which handle is being dragged
    startPoint: Point | null;
    currentPoint: Point | null;
    selectedId: string | null;
    hoveredId: string | null;
    hoveredHandle: 'start' | 'end' | null;  // NEW: which handle is hovered
    dragOffset: Point | null;
    // Raw screen coordinates for smooth preview (avoids chart time snapping)
    rawStartScreen: ScreenPoint | null;
    rawCurrentScreen: ScreenPoint | null;
}

// Snap options
export interface SnapOptions {
    enabled: boolean;
    snapToOHLC: boolean;  // Snap to candle Open/High/Low/Close
    snapDistance: number; // in pixels
}

// Enhanced Drawing Manager for TradingView-style interactions
export class DrawingManager {
    private chart: any;
    private series: any;
    private drawings: Drawing[] = [];
    private state: DrawingState = {
        tool: 'none',
        mode: 'idle',
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
    private snapOptions: SnapOptions = {
        enabled: false,
        snapToOHLC: false,
        snapDistance: 10,
    };
    private candleData: any[] = [];
    private touchMode: boolean = false; // Larger hit targets for touch devices
    private callbacks: {
        onDrawingsChange?: (drawings: Drawing[]) => void;
        onStateChange?: (state: DrawingState) => void;
        onCursorChange?: (cursor: CursorStyle) => void;
    } = {};

    constructor(chart: any, series: any) {
        this.chart = chart;
        this.series = series;
    }

    setCandleData(data: any[]) {
        this.candleData = data;
    }

    setSnapEnabled(enabled: boolean) {
        this.snapOptions.enabled = enabled;
        this.snapOptions.snapToOHLC = enabled;
    }

    isSnapEnabled(): boolean {
        return this.snapOptions.enabled;
    }

    // Enable touch mode for larger hit targets on mobile
    setTouchMode(enabled: boolean) {
        this.touchMode = enabled;
    }

    isTouchMode(): boolean {
        return this.touchMode;
    }

    setCallbacks(callbacks: typeof this.callbacks) {
        this.callbacks = callbacks;
    }

    getState(): DrawingState {
        return { ...this.state };
    }

    getDrawings(): Drawing[] {
        return [...this.drawings];
    }

    setDrawings(drawings: Drawing[]) {
        this.drawings = drawings;
        this.callbacks.onDrawingsChange?.(this.drawings);
    }

    // Set active tool
    setTool(tool: DrawingTool) {
        this.state.tool = tool;
        this.state.mode = tool === 'none' ? 'idle' : 'idle';
        this.state.isDrawing = false;
        this.state.startPoint = null;
        this.state.currentPoint = null;

        if (tool === 'select') {
            this.callbacks.onCursorChange?.('default');
        } else if (tool !== 'none') {
            this.callbacks.onCursorChange?.('crosshair');
        } else {
            this.callbacks.onCursorChange?.('default');
        }

        this.callbacks.onStateChange?.(this.state);
    }

    // Convert screen to chart coordinates
    screenToChart(x: number, y: number): Point | null {
        const time = this.chart.timeScale().coordinateToTime(x);
        const price = this.series.coordinateToPrice(y);
        if (time === null || price === null) return null;
        return { time: time as number, price };
    }

    // Convert chart to screen coordinates  
    chartToScreen(point: Point): ScreenPoint | null {
        const x = this.chart.timeScale().timeToCoordinate(point.time);
        const y = this.series.priceToCoordinate(point.price);
        if (x === null || y === null) return null;
        return { x, y };
    }

    // Snap point to nearest OHLC if enabled
    snapToOHLC(point: Point, screenY: number): Point {
        if (!this.snapOptions.enabled || !this.snapOptions.snapToOHLC) return point;

        // Find nearest candle
        const nearestCandle = this.candleData.find(c => c.time === point.time);
        if (!nearestCandle) return point;

        // Check which OHLC value is closest
        const prices = [
            { price: nearestCandle.open, label: 'open' },
            { price: nearestCandle.high, label: 'high' },
            { price: nearestCandle.low, label: 'low' },
            { price: nearestCandle.close, label: 'close' },
        ];

        let closest = point.price;
        let minDist = Infinity;

        for (const p of prices) {
            const pScreen = this.series.priceToCoordinate(p.price);
            if (pScreen === null) continue;
            const dist = Math.abs(pScreen - screenY);
            if (dist < minDist && dist < this.snapOptions.snapDistance) {
                minDist = dist;
                closest = p.price;
            }
        }

        return { time: point.time, price: closest };
    }

    // Find drawing at point (for selection)
    // Touch devices get larger tolerance (15px vs 8px) for easier selection
    findDrawingAtPoint(x: number, y: number, tolerance?: number): string | null {
        const actualTolerance = tolerance ?? (this.touchMode ? 15 : 8);
        const point = this.screenToChart(x, y);
        if (!point) return null;

        // Check in reverse order (top drawings first)
        for (let i = this.drawings.length - 1; i >= 0; i--) {
            const d = this.drawings[i];
            if (!d.visible) continue;

            if (this.isPointOnDrawing(d, x, y, actualTolerance)) {
                return d.id;
            }
        }
        return null;
    }

    private isPointOnDrawing(drawing: Drawing, x: number, y: number, tolerance: number): boolean {
        switch (drawing.type) {
            case 'hline': {
                const lineY = this.series.priceToCoordinate(drawing.price);
                return lineY !== null && Math.abs(y - lineY) < tolerance;
            }
            case 'trendline': {
                const start = this.chartToScreen(drawing.start);
                const end = this.chartToScreen(drawing.end);
                if (!start || !end) return false;
                return this.distanceToLine(x, y, start.x, start.y, end.x, end.y) < tolerance;
            }
            case 'rect': {
                const start = this.chartToScreen(drawing.start);
                const end = this.chartToScreen(drawing.end);
                if (!start || !end) return false;
                const minX = Math.min(start.x, end.x);
                const maxX = Math.max(start.x, end.x);
                const minY = Math.min(start.y, end.y);
                const maxY = Math.max(start.y, end.y);
                return x >= minX - tolerance && x <= maxX + tolerance &&
                    y >= minY - tolerance && y <= maxY + tolerance;
            }
            case 'fib': {
                const start = this.chartToScreen(drawing.start);
                const end = this.chartToScreen(drawing.end);
                if (!start || !end) return false;
                const minX = Math.min(start.x, end.x);
                const maxX = Math.max(start.x, end.x);
                // Check if on any fib level line
                const highPrice = Math.max(drawing.start.price, drawing.end.price);
                const lowPrice = Math.min(drawing.start.price, drawing.end.price);
                const range = highPrice - lowPrice;
                for (const level of drawing.levels) {
                    const price = highPrice - range * level;
                    const lineY = this.series.priceToCoordinate(price);
                    if (lineY !== null && x >= minX && x <= maxX && Math.abs(y - lineY) < tolerance) {
                        return true;
                    }
                }
                return false;
            }
        }
        return false;
    }

    private distanceToLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = lenSq !== 0 ? dot / lenSq : -1;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
    }

    // Find resize handle at point (for resizing)
    findHandleAtPoint(x: number, y: number): { drawingId: string; handle: 'start' | 'end' } | null {
        const handleTolerance = this.touchMode ? 20 : 12;

        for (let i = this.drawings.length - 1; i >= 0; i--) {
            const d = this.drawings[i];
            if (!d.visible || !d.selected) continue;  // Only check selected drawings

            if (d.type === 'trendline' || d.type === 'fib' || d.type === 'rect') {
                const startScreen = this.chartToScreen(d.start);
                const endScreen = this.chartToScreen(d.end);

                if (startScreen) {
                    const distToStart = Math.sqrt((x - startScreen.x) ** 2 + (y - startScreen.y) ** 2);
                    if (distToStart < handleTolerance) {
                        return { drawingId: d.id, handle: 'start' };
                    }
                }

                if (endScreen) {
                    const distToEnd = Math.sqrt((x - endScreen.x) ** 2 + (y - endScreen.y) ** 2);
                    if (distToEnd < handleTolerance) {
                        return { drawingId: d.id, handle: 'end' };
                    }
                }
            }
        }
        return null;
    }

    // Mouse down - start drawing, select, or resize
    handleMouseDown(x: number, y: number): void {
        const point = this.screenToChart(x, y);
        if (!point) return;

        // Check for resize handle first (only for selected drawings)
        if (this.state.selectedId) {
            const handleHit = this.findHandleAtPoint(x, y);
            if (handleHit && handleHit.drawingId === this.state.selectedId) {
                this.state.isResizing = true;
                this.state.resizingHandle = handleHit.handle;
                this.state.mode = 'resizing';
                this.state.startPoint = point;
                this.callbacks.onCursorChange?.('crosshair');
                this.callbacks.onStateChange?.(this.state);
                return;
            }
        }

        if (this.state.tool === 'select' || this.state.tool === 'none') {
            // Try to select a drawing
            const hitId = this.findDrawingAtPoint(x, y);
            if (hitId) {
                this.selectDrawing(hitId);
                this.state.isDragging = true;
                this.state.mode = 'moving';
                this.state.startPoint = point;
                this.callbacks.onCursorChange?.('grabbing');
            } else {
                this.deselectAll();
            }
        } else if (this.state.tool !== 'none') {
            // Start drawing
            const snappedPoint = this.snapToOHLC(point, y);
            this.state.isDrawing = true;
            this.state.mode = 'drawing';
            this.state.startPoint = snappedPoint;
            this.state.currentPoint = snappedPoint;
            // Store raw screen coordinates for smooth preview
            this.state.rawStartScreen = { x, y };
            this.state.rawCurrentScreen = { x, y };

            // For hline, complete immediately
            if (this.state.tool === 'hline') {
                this.completeDrawing(snappedPoint);
            }
        }

        this.callbacks.onStateChange?.(this.state);
    }

    // Mouse move - preview, drag, or resize
    handleMouseMove(x: number, y: number): void {
        const point = this.screenToChart(x, y);
        if (!point) return;

        if (this.state.isDrawing && this.state.startPoint) {
            // Drawing mode - update preview (use raw screen coords for smooth cursor following)
            this.state.currentPoint = point;
            this.state.rawCurrentScreen = { x, y };
            this.callbacks.onStateChange?.(this.state);
        } else if (this.state.isResizing && this.state.selectedId && this.state.resizingHandle) {
            // Resizing mode - update the endpoint
            const snappedPoint = this.snapToOHLC(point, y);
            this.resizeSelectedDrawing(snappedPoint);
        } else if (this.state.isDragging && this.state.selectedId && this.state.startPoint) {
            // Moving a selected drawing
            this.moveSelectedDrawing(point);
        } else {
            // Hover detection for handles and drawings
            let newCursor: CursorStyle = 'default';
            let hoveredHandle: 'start' | 'end' | null = null;

            // Check for handle hover on selected drawing
            if (this.state.selectedId) {
                const handleHit = this.findHandleAtPoint(x, y);
                if (handleHit && handleHit.drawingId === this.state.selectedId) {
                    hoveredHandle = handleHit.handle;
                    newCursor = 'crosshair';
                }
            }

            // Check for drawing hover
            const hitId = this.findDrawingAtPoint(x, y);

            if (hoveredHandle !== this.state.hoveredHandle || hitId !== this.state.hoveredId) {
                this.state.hoveredHandle = hoveredHandle;
                this.state.hoveredId = hitId;

                if (this.state.tool === 'none' || this.state.tool === 'select') {
                    if (hoveredHandle) {
                        newCursor = 'crosshair';
                    } else if (hitId) {
                        newCursor = 'grab';
                    }
                    this.callbacks.onCursorChange?.(newCursor);
                }
                this.callbacks.onStateChange?.(this.state);
            }
        }
    }

    // Mouse up - complete drawing, stop dragging, or stop resizing
    handleMouseUp(x: number, y: number): void {
        const point = this.screenToChart(x, y);

        if (this.state.isDrawing && this.state.startPoint && point) {
            const snappedPoint = this.snapToOHLC(point, y);
            this.completeDrawing(snappedPoint);
        }

        if (this.state.isDragging) {
            this.state.isDragging = false;
            this.state.mode = 'idle';
            this.callbacks.onCursorChange?.(this.state.hoveredId ? 'grab' : 'default');
        }

        if (this.state.isResizing) {
            this.state.isResizing = false;
            this.state.resizingHandle = null;
            this.state.mode = 'idle';
            this.callbacks.onCursorChange?.(this.state.hoveredId ? 'grab' : 'default');
        }

        this.state.isDrawing = false;
        this.state.startPoint = null;
        this.callbacks.onStateChange?.(this.state);
    }

    // Complete a drawing
    private completeDrawing(endPoint: Point): void {
        if (!this.state.startPoint) return;

        const start = this.state.startPoint;
        const id = `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let newDrawing: Drawing | null = null;

        switch (this.state.tool) {
            case 'trendline':
                newDrawing = {
                    id, type: 'trendline',
                    start, end: endPoint,
                    color: '#3B82F6', visible: true,
                };
                break;
            case 'hline':
                newDrawing = {
                    id, type: 'hline',
                    price: endPoint.price,
                    color: '#FBBF24', visible: true,
                };
                break;
            case 'fib':
                newDrawing = {
                    id, type: 'fib',
                    start, end: endPoint,
                    color: '#8B5CF6',
                    levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
                    visible: true,
                };
                break;
            case 'rect':
                newDrawing = {
                    id, type: 'rect',
                    start, end: endPoint,
                    color: '#10B981',
                    fillColor: 'rgba(16, 185, 129, 0.15)',
                    visible: true,
                };
                break;
        }

        if (newDrawing) {
            this.drawings.push(newDrawing);
            this.callbacks.onDrawingsChange?.(this.drawings);
        }

        // Reset state
        this.state.isDrawing = false;
        this.state.mode = 'idle';
        this.state.startPoint = null;
        this.state.currentPoint = null;
        this.setTool('none');
    }

    // Select a drawing
    selectDrawing(id: string): void {
        this.drawings = this.drawings.map(d => ({
            ...d,
            selected: d.id === id,
        }));
        this.state.selectedId = id;
        this.callbacks.onDrawingsChange?.(this.drawings);
        this.callbacks.onStateChange?.(this.state);
    }

    // Deselect all
    deselectAll(): void {
        this.drawings = this.drawings.map(d => ({ ...d, selected: false }));
        this.state.selectedId = null;
        this.callbacks.onDrawingsChange?.(this.drawings);
        this.callbacks.onStateChange?.(this.state);
    }

    // Move selected drawing
    private moveSelectedDrawing(newPoint: Point): void {
        if (!this.state.selectedId || !this.state.startPoint) return;

        const deltaTime = newPoint.time - this.state.startPoint.time;
        const deltaPrice = newPoint.price - this.state.startPoint.price;

        this.drawings = this.drawings.map(d => {
            if (d.id !== this.state.selectedId) return d;

            switch (d.type) {
                case 'hline':
                    return { ...d, price: d.price + deltaPrice };
                case 'trendline':
                case 'fib':
                case 'rect':
                    return {
                        ...d,
                        start: { time: d.start.time + deltaTime, price: d.start.price + deltaPrice },
                        end: { time: d.end.time + deltaTime, price: d.end.price + deltaPrice },
                    };
                default:
                    return d;
            }
        });

        this.state.startPoint = newPoint;
        this.callbacks.onDrawingsChange?.(this.drawings);
    }

    // Resize selected drawing (update start or end point)
    private resizeSelectedDrawing(newPoint: Point): void {
        if (!this.state.selectedId || !this.state.resizingHandle) return;

        this.drawings = this.drawings.map(d => {
            if (d.id !== this.state.selectedId) return d;

            switch (d.type) {
                case 'trendline':
                case 'fib':
                case 'rect':
                    if (this.state.resizingHandle === 'start') {
                        return { ...d, start: newPoint };
                    } else {
                        return { ...d, end: newPoint };
                    }
                default:
                    return d;
            }
        });

        this.callbacks.onDrawingsChange?.(this.drawings);
    }

    // Delete selected drawing
    deleteSelected(): boolean {
        if (!this.state.selectedId) return false;

        this.drawings = this.drawings.filter(d => d.id !== this.state.selectedId);
        this.state.selectedId = null;
        this.callbacks.onDrawingsChange?.(this.drawings);
        this.callbacks.onStateChange?.(this.state);
        return true;
    }

    // Clear all drawings
    clearAll(): void {
        this.drawings = [];
        this.state.selectedId = null;
        this.state.hoveredId = null;
        this.callbacks.onDrawingsChange?.(this.drawings);
        this.callbacks.onStateChange?.(this.state);
    }

    // Cancel current drawing
    cancelDrawing(): void {
        this.state.isDrawing = false;
        this.state.isDragging = false;
        this.state.mode = 'idle';
        this.state.startPoint = null;
        this.state.currentPoint = null;
        this.setTool('none');
    }
}
