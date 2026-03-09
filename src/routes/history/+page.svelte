<script lang="ts">
    import type { PageData } from './$types';

    export let data: PageData;

    $: ({ days, availableDates } = data);

    let selectedDate = '';

    $: if (availableDates.length > 0 && !selectedDate) {
        selectedDate = availableDates[0];
    }

    $: selectedDay = days.find(d => d.date === selectedDate);

    function formatProfit(profit: number): string {
        const sign = profit > 0 ? '+' : '';
        return `${sign}${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
</script>

<svelte:head>
    <title>Competition History | EliteGold</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
        <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold dark:text-white">
                    Competition <span class="text-gold">History</span>
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Daily snapshots of the competition leaderboard
                </p>
            </div>
            <a href="/leaderboard" class="text-sm text-blue-600 hover:text-blue-500">&larr; Current Leaderboard</a>
        </div>

        {#if availableDates.length === 0}
            <div class="rounded-xl border border-dashed border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface px-6 py-16 text-center">
                <div class="text-4xl mb-3">&#x1F4C5;</div>
                <h2 class="text-lg font-semibold dark:text-white">No history data yet</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">History will appear once the competition starts running</p>
            </div>
        {:else}
            <!-- Date Selector -->
            <div class="mb-6 flex items-center gap-3">
                <label for="history-date" class="text-sm font-medium dark:text-gray-300">Date:</label>
                <select
                    id="history-date"
                    bind:value={selectedDate}
                    class="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                >
                    {#each availableDates as date}
                        <option value={date}>{formatDate(date)}</option>
                    {/each}
                </select>
                <span class="text-xs text-gray-400 dark:text-gray-500">
                    {availableDates.length} days recorded
                </span>
            </div>

            {#if selectedDay}
                <!-- Top Performer Banner -->
                {#if selectedDay.topTrader}
                    <div class="mb-4 p-4 rounded-xl border-2 border-amber-400/30 dark:border-amber-500/20 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                    Top Performer &middot; {formatDate(selectedDate)}
                                </span>
                                <div class="text-lg font-bold dark:text-white mt-1">{selectedDay.topTrader.nickname}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-xl font-bold {selectedDay.topTrader.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    {formatProfit(selectedDay.topTrader.profit)}
                                </div>
                                <div class="text-xs text-gray-400">{selectedDay.topTrader.points} pts</div>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Leaderboard Snapshot Table -->
                <div class="rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-dark-bg/50">
                                <tr>
                                    <th class="px-4 py-3 text-left">Rank</th>
                                    <th class="px-4 py-3 text-left">Trader</th>
                                    <th class="px-4 py-3 text-right">Points</th>
                                    <th class="px-4 py-3 text-right">Profit</th>
                                    <th class="px-4 py-3 text-right">Win Rate</th>
                                    <th class="px-4 py-3 text-right">Trades</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-dark-border">
                                {#each selectedDay.entries as entry, i}
                                    {@const rank = i + 1}
                                    <tr class="hover:bg-gray-50 dark:hover:bg-dark-border/20 {rank <= 3 ? 'font-semibold' : ''}">
                                        <td class="px-4 py-3">
                                            {#if rank === 1}&#x1F947;{:else if rank === 2}&#x1F948;{:else if rank === 3}&#x1F949;{:else}#{rank}{/if}
                                        </td>
                                        <td class="px-4 py-3 dark:text-white">
                                            <a href="/leaderboard/{entry.participantId}" class="hover:text-amber-500">{entry.nickname}</a>
                                        </td>
                                        <td class="px-4 py-3 text-right font-bold dark:text-white">{entry.points.toLocaleString()}</td>
                                        <td class="px-4 py-3 text-right font-mono {entry.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                            {formatProfit(entry.profit)}
                                        </td>
                                        <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                            {entry.winRate != null ? `${entry.winRate.toFixed(1)}%` : '-'}
                                        </td>
                                        <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                            {entry.totalTrades ?? '-'}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</div>
