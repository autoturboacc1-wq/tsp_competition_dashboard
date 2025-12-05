<script lang="ts">
    export let data;
    const { trades } = data;

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleString();
    }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Recent Trades
        </h1>

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
    </div>
</div>
