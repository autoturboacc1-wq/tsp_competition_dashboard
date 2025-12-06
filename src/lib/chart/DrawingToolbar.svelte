<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { DrawingTool, DrawingState } from "./DrawingManager";

    export let drawingState: DrawingState;
    export let hasDrawings: boolean = false;

    const dispatch = createEventDispatcher();

    const tools = [
        {
            id: "select",
            icon: "👆",
            label: "Select",
            shortcut: "V",
            description: "Select & move drawings",
        },
        {
            id: "trendline",
            icon: "📈",
            label: "Trend",
            shortcut: "T",
            description: "Draw trend line",
        },
        {
            id: "hline",
            icon: "➖",
            label: "H-Line",
            shortcut: "H",
            description: "Horizontal line",
        },
        {
            id: "fib",
            icon: "🔢",
            label: "Fib",
            shortcut: "F",
            description: "Fibonacci retracement",
        },
        {
            id: "rect",
            icon: "⬜",
            label: "Rect",
            shortcut: "R",
            description: "Rectangle zone",
        },
    ] as const;

    $: activeTool = drawingState?.tool || "none";
    $: isDrawing = drawingState?.isDrawing || false;
    $: selectedId = drawingState?.selectedId;

    function selectTool(tool: DrawingTool) {
        dispatch("selectTool", tool);
    }

    function clearAll() {
        dispatch("clearAll");
    }

    function deleteSelected() {
        dispatch("deleteSelected");
    }

    function handleKeydown(e: KeyboardEvent) {
        // Escape to cancel
        if (e.key === "Escape") {
            dispatch("cancel");
            return;
        }

        // Delete/Backspace to remove selected
        if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
            e.preventDefault();
            deleteSelected();
            return;
        }

        // Tool shortcuts
        const key = e.key.toUpperCase();
        const tool = tools.find((t) => t.shortcut === key);
        if (tool) {
            e.preventDefault();
            selectTool(tool.id as DrawingTool);
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
    class="flex items-center gap-1 px-3 py-2 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700"
>
    <!-- Drawing Tools -->
    <div class="flex items-center gap-0.5">
        {#each tools as tool}
            <button
                on:click={() => selectTool(tool.id as DrawingTool)}
                class="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all
                    {activeTool === tool.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'}"
                title="{tool.description} ({tool.shortcut})"
            >
                <span class="text-sm">{tool.icon}</span>
                <span class="hidden md:inline">{tool.label}</span>
            </button>
        {/each}
    </div>

    <!-- Divider -->
    <div class="w-px h-5 bg-gray-600 mx-1.5"></div>

    <!-- Delete Selected -->
    {#if selectedId}
        <button
            on:click={deleteSelected}
            class="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium
                   bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
            title="Delete Selected (DEL)"
        >
            <span>🗑️</span>
            <span class="hidden sm:inline">Delete</span>
        </button>
    {/if}

    <!-- Clear All -->
    <button
        on:click={clearAll}
        disabled={!hasDrawings}
        class="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all
            {hasDrawings
            ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
            : 'text-gray-600 cursor-not-allowed'}"
        title="Clear All Drawings"
    >
        <span>✖️</span>
        <span class="hidden sm:inline">Clear</span>
    </button>

    <!-- Status/Instructions -->
    <div class="ml-auto flex items-center gap-2 text-[11px] text-gray-500">
        {#if isDrawing}
            <span class="text-blue-400"> Drag to draw • </span>
            <kbd class="px-1 py-0.5 bg-gray-700 rounded text-[10px]">ESC</kbd>
            <span>cancel</span>
        {:else if activeTool !== "none" && activeTool !== "select"}
            <span class="hidden sm:inline text-gray-400"
                >Click & drag on chart</span
            >
            <kbd class="px-1 py-0.5 bg-gray-700 rounded text-[10px]">ESC</kbd>
        {:else if selectedId}
            <span class="hidden sm:inline text-blue-400">Drag to move</span>
            <kbd class="px-1 py-0.5 bg-gray-700 rounded text-[10px]">DEL</kbd>
            <span>delete</span>
        {:else}
            <span class="hidden lg:inline text-gray-500">
                Click tool or use shortcuts:
                {#each tools as t, i}
                    <kbd
                        class="px-1 py-0.5 bg-gray-700/50 rounded text-[10px] mx-0.5"
                        >{t.shortcut}</kbd
                    >{i < tools.length - 1 ? "" : ""}
                {/each}
            </span>
        {/if}
    </div>
</div>
