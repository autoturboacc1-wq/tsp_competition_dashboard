<script lang="ts">
    import TableSkeleton from "$lib/components/TableSkeleton.svelte";
</script>

<div class="space-y-6" aria-hidden="true">
    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <div class="h-16 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-dark-border"></div>
                <div class="space-y-3">
                    <div class="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                    <div class="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                </div>
            </div>
            <div class="space-y-3 text-right">
                <div class="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                <div class="h-8 w-28 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
            </div>
        </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
            <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <div class="mb-4 h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                <div class="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-dark-bg"></div>
            </div>
            <TableSkeleton rows={6} columns={5} />
        </div>

        <div class="space-y-6">
            {#each Array(3) as _}
                <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <div class="mb-4 h-5 w-28 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                    <div class="space-y-3">
                        {#each Array(5) as __}
                            <div class="flex items-center justify-between gap-3">
                                <div class="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                                <div class="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-dark-border"></div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
