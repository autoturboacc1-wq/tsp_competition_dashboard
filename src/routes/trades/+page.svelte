<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { ASYNC_COPY } from "$lib/async-state";
    import StatusBanner from "$lib/components/StatusBanner.svelte";
    import TableSkeleton from "$lib/components/TableSkeleton.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;

    let isRefreshing = false;
    let refreshError: string | null = null;

    $: trades = data.trades;
    $: hasTrades = trades.length > 0;

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleString();
    }

    async function handleRefresh() {
        isRefreshing = true;
        refreshError = null;

        try {
            await invalidateAll();
        } catch (error) {
            console.error("Failed to refresh trades:", error);
            refreshError = "ไม่สามารถอัปเดตรายการเทรดได้ในขณะนี้";
        } finally {
            isRefreshing = false;
        }
    }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                    Recent Trades
                </h1>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    ติดตามรายการเทรดล่าสุดและเปิดดูกราฟย้อนหลังได้ทันที
                </p>
            </div>

            <button
                class="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                on:click={handleRefresh}
                disabled={isRefreshing}
            >
                {isRefreshing ? ASYNC_COPY.refreshing : "Refresh"}
            </button>
        </div>

        <div class="mb-4 space-y-3">
            {#if refreshError}
                <StatusBanner
                    tone="error"
                    title="อัปเดตข้อมูลไม่สำเร็จ"
                    message={refreshError}
                    actionLabel={ASYNC_COPY.retry}
                    on:action={handleRefresh}
                />
            {/if}

            {#if data.loadError}
                <StatusBanner
                    tone="error"
                    title="โหลดรายการเทรดไม่สำเร็จ"
                    message={data.loadError}
                    actionLabel={ASYNC_COPY.retry}
                    on:action={handleRefresh}
                />
            {/if}
        </div>

        {#if isRefreshing && !hasTrades}
            <TableSkeleton rows={6} columns={6} />
        {:else if hasTrades}
            <div
                class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg"
            >
                <table
                    class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                >
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th
                                scope="col"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                >Symbol</th
                            >
                            <th
                                scope="col"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                >Type</th
                            >
                            <th
                                scope="col"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                >Open Time</th
                            >
                            <th
                                scope="col"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                >Price</th
                            >
                            <th
                                scope="col"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                >Profit</th
                            >
                            <th scope="col" class="relative px-6 py-3">
                                <span class="sr-only">View</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody
                        class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
                    >
                        {#each trades as trade}
                            <tr
                                class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                on:click={() =>
                                    (window.location.href = `/trades/${trade.id}`)}
                            >
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"
                                    >{trade.symbol}</td
                                >
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <span
                                        class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {trade.type ===
                                        'BUY'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'}"
                                    >
                                        {trade.type}
                                    </span>
                                </td>
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                                    >{formatDate(trade.open_time)}</td
                                >
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                                    >{trade.open_price}</td
                                >
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-sm font-medium {trade.profit >=
                                    0
                                        ? 'text-green-600'
                                        : 'text-red-600'}"
                                >
                                    {trade.profit >= 0 ? "+" : ""}{trade.profit}
                                </td>
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                                >
                                    <a
                                        href="/trades/{trade.id}"
                                        class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                        >View</a
                                    >
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <div
                class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                    {ASYNC_COPY.empty}
                </h2>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    ยังไม่มีรายการเทรดล่าสุดให้แสดง
                </p>
            </div>
        {/if}
    </div>
</div>
