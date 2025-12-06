<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { DrawingTool } from "./DrawingManager";

    export let activeTool: DrawingTool = "none";
    export let hasDrawings: boolean = false;

    const dispatch = createEventDispatcher();

    const tools = [
        { id: "trendline", icon: "📈", label: "Trend Line", shortcut: "T" },
        { id: "hline", icon: "➖", label: "H-Line", shortcut: "H" },
        { id: "fib", icon: "🔢", label: "Fibonacci", shortcut: "F" },
        { id: "rect", icon: "⬜", label: "Rectangle", shortcut: "R" },
    ] as const;

    function selectTool(tool: DrawingTool) {
        dispatch("selectTool", tool);
    }

    function clearAll() {
        dispatch("clearAll");
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            dispatch("cancel");
            return;
        }

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
    class="flex items-center gap-1 px-3 py-2 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700"
>
    <!-- Drawing Tools -->
    <div class="flex items-center gap-1">
        {#each tools as tool}
            <button
                on:click={() => selectTool(tool.id as DrawingTool)}
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                    {activeTool === tool.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white'}"
                title="{tool.label} ({tool.shortcut})"
            >
                <span>{tool.icon}</span>
                <span class="hidden sm:inline">{tool.label}</span>
            </button>
        {/each}
    </div>

    <!-- Divider -->
    <div class="w-px h-6 bg-gray-600 mx-2"></div>

    <!-- Clear Button -->
    <button
        on:click={clearAll}
        disabled={!hasDrawings}
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
            {hasDrawings
            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
            : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'}"
        title="Clear All Drawings"
    >
        <span>🗑️</span>
        <span class="hidden sm:inline">Clear</span>
    </button>

    <!-- Status -->
    {#if activeTool !== "none"}
        <div class="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span class="hidden sm:inline">
                {#if activeTool === "hline"}
                    Click to place line
                {:else}
                    Click to set start point
                {/if}
            </span>
            <kbd class="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">ESC</kbd>
            <span class="hidden sm:inline">to cancel</span>
        </div>
    {/if}
</div>
