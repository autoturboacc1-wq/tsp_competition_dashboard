<script lang="ts">
    export let rows = 5;
    export let columns = 4;
</script>

<div
    class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface"
    aria-hidden="true"
>
    <div class="border-b border-gray-200 px-6 py-4 dark:border-dark-border">
        <div class="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
    </div>

    <div class="space-y-4 px-6 py-4">
        {#each Array(rows) as _, row}
            <div class="grid gap-4" style={`grid-template-columns: repeat(${columns}, minmax(0, 1fr));`}>
                {#each Array(columns) as __, col}
                    <div
                        class={`h-4 animate-pulse rounded bg-gray-200 dark:bg-dark-border ${
                            col === 0 ? "w-3/4" : "w-full"
                        } ${row === 0 ? "opacity-90" : "opacity-70"}`}
                    ></div>
                {/each}
            </div>
        {/each}
    </div>
</div>
