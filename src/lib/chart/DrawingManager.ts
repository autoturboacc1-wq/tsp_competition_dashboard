// Drawing Types
export interface Point {
    time: number;
    price: number;
}

export interface DrawingBase {
    id: string;
    type: 'trendline' | 'hline' | 'fib' | 'rect';
    color: string;
    visible: boolean;
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
    levels: number[]; // 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1
}

export interface RectangleDrawing extends DrawingBase {
    type: 'rect';
    start: Point;
    end: Point;
    fillColor: string;
}

export type Drawing = TrendLineDrawing | HorizontalLineDrawing | FibRetracementDrawing | RectangleDrawing;

export type DrawingTool = 'none' | 'trendline' | 'hline' | 'fib' | 'rect';

// Drawing Manager Class
export class DrawingManager {
    private chart: any;
    private series: any;
    private drawings: Drawing[] = [];
    private currentTool: DrawingTool = 'none';
    private pendingStart: Point | null = null;
    private previewLine: any = null;
    private callbacks: {
        onDrawingsChange?: (drawings: Drawing[]) => void;
        onToolChange?: (tool: DrawingTool) => void;
    } = {};

    constructor(chart: any, series: any) {
        this.chart = chart;
        this.series = series;
    }

    setCallbacks(callbacks: typeof this.callbacks) {
        this.callbacks = callbacks;
    }

    setTool(tool: DrawingTool) {
        this.currentTool = tool;
        this.pendingStart = null;
        this.clearPreview();
        this.callbacks.onToolChange?.(tool);
    }

    getTool(): DrawingTool {
        return this.currentTool;
    }

    getDrawings(): Drawing[] {
        return [...this.drawings];
    }

    // Convert screen coordinates to chart coordinates
    screenToChart(x: number, y: number): Point | null {
        const time = this.chart.timeScale().coordinateToTime(x);
        const price = this.series.coordinateToPrice(y);

        if (time === null || price === null) return null;
        return { time: time as number, price };
    }

    // Handle click on chart
    handleClick(x: number, y: number): boolean {
        if (this.currentTool === 'none') return false;

        const point = this.screenToChart(x, y);
        if (!point) return false;

        if (this.currentTool === 'hline') {
            // Horizontal line only needs one click
            this.addDrawing({
                id: this.generateId(),
                type: 'hline',
                price: point.price,
                color: '#FBBF24',
                visible: true,
            });
            this.setTool('none');
            return true;
        }

        // Two-click drawings (trendline, fib, rect)
        if (!this.pendingStart) {
            this.pendingStart = point;
            return true;
        }

        // Second click - complete drawing
        this.completeDrawing(point);
        return true;
    }

    // Handle mouse move for preview
    handleMove(x: number, y: number): void {
        if (this.currentTool === 'none' || !this.pendingStart) return;

        const point = this.screenToChart(x, y);
        if (!point) return;

        this.updatePreview(this.pendingStart, point);
    }

    // Cancel current drawing (ESC)
    cancelDrawing(): void {
        this.pendingStart = null;
        this.clearPreview();
        this.setTool('none');
    }

    // Clear all drawings
    clearAll(): void {
        this.drawings = [];
        this.pendingStart = null;
        this.clearPreview();
        this.renderDrawings();
        this.callbacks.onDrawingsChange?.(this.drawings);
    }

    // Remove specific drawing
    removeDrawing(id: string): void {
        this.drawings = this.drawings.filter(d => d.id !== id);
        this.renderDrawings();
        this.callbacks.onDrawingsChange?.(this.drawings);
    }

    private generateId(): string {
        return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private addDrawing(drawing: Drawing): void {
        this.drawings.push(drawing);
        this.renderDrawings();
        this.callbacks.onDrawingsChange?.(this.drawings);
    }

    private completeDrawing(endPoint: Point): void {
        if (!this.pendingStart) return;

        const start = this.pendingStart;

        switch (this.currentTool) {
            case 'trendline':
                this.addDrawing({
                    id: this.generateId(),
                    type: 'trendline',
                    start,
                    end: endPoint,
                    color: '#3B82F6',
                    visible: true,
                });
                break;
            case 'fib':
                this.addDrawing({
                    id: this.generateId(),
                    type: 'fib',
                    start,
                    end: endPoint,
                    color: '#8B5CF6',
                    levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
                    visible: true,
                });
                break;
            case 'rect':
                this.addDrawing({
                    id: this.generateId(),
                    type: 'rect',
                    start,
                    end: endPoint,
                    color: '#10B981',
                    fillColor: 'rgba(16, 185, 129, 0.1)',
                    visible: true,
                });
                break;
        }

        this.pendingStart = null;
        this.clearPreview();
        this.setTool('none');
    }

    private updatePreview(start: Point, end: Point): void {
        // Preview will be rendered in the render loop
        // For now we just store the preview state
    }

    private clearPreview(): void {
        this.previewLine = null;
    }

    // Main render function - called to draw all drawings on chart
    renderDrawings(): void {
        // This will be implemented per-drawing in the Svelte component
        // since we need access to canvas/SVG overlay
    }

    // Get drawing data for rendering
    getDrawingsForRender(): Drawing[] {
        return this.drawings.filter(d => d.visible);
    }
}
