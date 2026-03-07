<script lang="ts">
    import TableSkeleton from "$lib/components/TableSkeleton.svelte";
</script>

<div class="space-y-6" aria-hidden="true">
    <div class="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <div class="mb-6 h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
        <div class="grid gap-4 md:grid-cols-3">
            {#each Array(3) as _, index}
                <div
                    class={`rounded-2xl border border-gray-200 p-5 dark:border-dark-border ${
                        index === 1 ? "md:-translate-y-2" : ""
                    }`}
                >
                    <div class="mx-auto h-14 w-14 animate-pulse rounded-full bg-gray-200 dark:bg-dark-border"></div>
                    <div class="mx-auto mt-4 h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                    <div class="mx-auto mt-3 h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                    <div class="mx-auto mt-4 h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                </div>
            {/each}
        </div>
    </div>

    <TableSkeleton rows={7} columns={4} />
</div>
