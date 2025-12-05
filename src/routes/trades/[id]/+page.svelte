<script lang="ts">
    import TradeChart from "$lib/components/TradeChart.svelte";

    export let data;
    const { trade, initialCandles } = data;

    let currentTimeframe = 15;

    const timeframes = [
        { label: "M5", value: 5 },
        { label: "M15", value: 15 },
        { label: "H1", value: 60 },
        { label: "H4", value: 240 },
    ];

    function formatDate(dateStr: string) {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString();
    }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
        <!-- Back Button -->
        <a
            href="/trades"
            class="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 mb-6"
        >
            &larr; Back to Trades
        </a>

        <!-- Header -->
        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700"
        >
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                        <h1
                            class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3"
                        >
                            {trade.symbol}
                            <span
                                class="px-3 py-1 text-sm rounded-full {trade.type ===
                                'BUY'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'}"
                            >
                                {trade.type}
                            </span>
                        </h1>
                        <p class="text-gray-500 dark:text-gray-400 mt-1">
                            Ticket #{trade.position_id}
                        </p>
                    </div>

                    <!-- Timeframe Controls -->
                    <div class="flex items-center gap-2">
                        <label
                            for="timeframe"
                            class="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >Timeframe:</label
                        >
                        <select
                            id="timeframe"
                            bind:value={currentTimeframe}
                            class="block w-24 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1"
                        >
                            {#each timeframes as tf}
                                <option value={tf.value}>{tf.label}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="text-right">
                    <p
                        class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                    >
                        Profit
                    </p>
                    <p
                        class="text-3xl font-mono font-bold {trade.profit >= 0
                            ? 'text-green-600'
                            : 'text-red-600'}"
                    >
                        {trade.profit >= 0 ? "+" : ""}{Number(
                            trade.profit,
                        ).toFixed(2)}
                    </p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Chart Section -->
            <div class="lg:col-span-2">
                <div
                    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                    <div
                        class="p-4 border-b border-gray-200 dark:border-gray-700"
                    >
                        <h2
                            class="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                            Price Action
                        </h2>
                    </div>
                    <div class="p-4">
                        <TradeChart
                            {trade}
                            {initialCandles}
                            bind:currentTimeframe
                        />
                    </div>
                </div>
            </div>

            <!-- Details Section -->
            <div class="lg:col-span-1 space-y-6">
                <div
                    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                    <h3
                        class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                    >
                        Trade Details
                    </h3>

                    <dl class="space-y-4">
                        <div class="flex justify-between">
                            <dt
                                class="text-sm text-gray-500 dark:text-gray-400"
                            >
                                Open Price
                            </dt>
                            <dd
                                class="text-sm font-medium text-gray-900 dark:text-white"
                            >
                                {trade.open_price}
                            </dd>
                        </div>
                        <div class="flex justify-between">
                            <dt
                                class="text-sm text-gray-500 dark:text-gray-400"
                            >
                                Close Price
                            </dt>
                            <dd
                                class="text-sm font-medium text-gray-900 dark:text-white"
                            >
                                {trade.close_price}
                            </dd>
                        </div>
                        <div
                            class="border-t border-gray-200 dark:border-gray-700 my-2"
                        ></div>
                        <div class="flex justify-between">
                            <dt
                                class="text-sm text-gray-500 dark:text-gray-400"
                            >
                                Lot Size
                            </dt>
                            <dd
                                class="text-sm font-medium text-gray-900 dark:text-white"
                            >
                                {trade.lot_size}
                            </dd>
                        </div>
                        <div class="flex justify-between">
                            <dt
                                class="text-sm text-gray-500 dark:text-gray-400"
                            >
                                Stop Loss
                            </dt>
                            <dd class="text-sm font-medium text-red-600">
                                {trade.sl || "-"}
                            </dd>
                        </div>
                        <div class="flex justify-between">
                            <dt
                                class="text-sm text-gray-500 dark:text-gray-400"
                            >
                                Take Profit
                            </dt>
                            <dd class="text-sm font-medium text-green-600">
                                {trade.tp || "-"}
                            </dd>
                        </div>
                        <div
                            class="border-t border-gray-200 dark:border-gray-700 my-2"
                        ></div>
                        <div class="flex justify-between">
                            <dt
                                class="text-sm text-gray-500 dark:text-gray-400"
                            >
                                Open Time
                            </dt>
                            <dd
                                class="text-sm font-medium text-gray-900 dark:text-white text-right"
                            >
                                {formatDate(trade.open_time)}
                            </dd>
                        </div>
                        <div class="flex justify-between">
                            <dt
                                class="text-sm text-gray-500 dark:text-gray-400"
                            >
                                Close Time
                            </dt>
                            <dd
                                class="text-sm font-medium text-gray-900 dark:text-white text-right"
                            >
                                {formatDate(trade.close_time)}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    </div>
</div>
