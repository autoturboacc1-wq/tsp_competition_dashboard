<script lang="ts">
    import type { PageData } from './$types';

    export let data: PageData;

    let days: PageData['days'] = [];
    let availableDates: PageData['availableDates'] = [];

    $: ({ days, availableDates } = data);

    let selectedDate = '';

    $: if (availableDates.length > 0 && !selectedDate) {
        selectedDate = availableDates[0];
    }

    $: availableDateSet = new Set(availableDates);
    $: selectedDay = days.find((d: PageData['days'][number]) => d.date === selectedDate);
    $: currentIndex = availableDates.indexOf(selectedDate);
    $: canGoNewer = currentIndex > 0;
    $: canGoOlder = currentIndex < availableDates.length - 1;

    // Summary stats for the selected day
    $: daySummary = selectedDay ? (() => {
        const entries = selectedDay.entries;
        const totalProfit = entries.reduce((s: number, e: any) => s + e.profit, 0);
        const profitable = entries.filter((e: any) => e.profit > 0).length;
        const totalTrades = entries.reduce((s: number, e: any) => s + (e.totalTrades ?? 0), 0);
        return { participants: entries.length, totalProfit, profitable, totalTrades };
    })() : null;

    function goNewer() {
        if (canGoNewer) selectedDate = availableDates[currentIndex - 1];
    }

    function goOlder() {
        if (canGoOlder) selectedDate = availableDates[currentIndex + 1];
    }

    function formatProfit(profit: number): string {
        const sign = profit > 0 ? '+' : '';
        return `${sign}${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateShort(dateStr: string): string {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
</script>

<svelte:head>
    <title>Competition History | EliteGold</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-down">
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold dark:text-white">
                    Competition <span class="text-gold">History</span>
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Daily snapshots of the competition leaderboard
                </p>
            </div>
            <a href="/leaderboard" class="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                &larr; Current Leaderboard
            </a>
        </div>

        {#if availableDates.length === 0}
            <div class="rounded-xl border border-dashed border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface px-6 py-16 text-center animate-fade-in-up stagger-1">
                <div class="text-4xl mb-3">&#x1F4C5;</div>
                <h2 class="text-lg font-semibold dark:text-white">No history data yet</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">History will appear once the competition starts running</p>
            </div>
        {:else}
            <!-- Date Navigator -->
            <div class="mb-6 animate-fade-in-up stagger-1">
                <div class="flex items-center gap-2 sm:gap-3 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-3 sm:p-4">
                    <button
                        on:click={goOlder}
                        disabled={!canGoOlder}
                        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors btn-press"
                        aria-label="Older"
                    >
                        <svg class="w-5 h-5 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div class="flex-1 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                        <input
                            id="history-date"
                            type="date"
                            bind:value={selectedDate}
                            min={availableDates[availableDates.length - 1] ?? ''}
                            max={availableDates[0] ?? ''}
                            class="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full sm:w-auto"
                        />
                        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {#if selectedDate}
                                {formatDate(selectedDate)}
                            {/if}
                        </span>
                        <span class="text-xs text-gray-400 dark:text-gray-500">
                            {availableDates.length} days recorded
                            {#if selectedDate && !availableDateSet.has(selectedDate)}
                                · <span class="text-amber-500">No snapshot on this date</span>
                            {/if}
                        </span>
                    </div>

                    <button
                        on:click={goNewer}
                        disabled={!canGoNewer}
                        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors btn-press"
                        aria-label="Newer"
                    >
                        <svg class="w-5 h-5 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {#if selectedDay}
                <!-- Day Summary Stats -->
                {#if daySummary}
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in-up stagger-2">
                        <div class="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-4 text-center card-hover">
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Participants</div>
                            <div class="text-2xl font-bold dark:text-white mt-1">{daySummary.participants}</div>
                        </div>
                        <div class="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-4 text-center card-hover">
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total P&L</div>
                            <div class="text-2xl font-bold mt-1 {daySummary.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                {formatProfit(daySummary.totalProfit)}
                            </div>
                        </div>
                        <div class="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-4 text-center card-hover">
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profitable</div>
                            <div class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{daySummary.profitable}<span class="text-sm text-gray-400">/{daySummary.participants}</span></div>
                        </div>
                        <div class="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-4 text-center card-hover">
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Trades</div>
                            <div class="text-2xl font-bold dark:text-white mt-1">{daySummary.totalTrades}</div>
                        </div>
                    </div>
                {/if}

                <!-- Top Performer Banner -->
                {#if selectedDay.topTrader}
                    <div class="mb-5 p-4 rounded-xl border-2 border-amber-400/30 dark:border-amber-500/20 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/10 dark:to-transparent animate-fade-in-up stagger-3">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                    &#x1F3C6; Top Performer &middot; {formatDateShort(selectedDate)}
                                </span>
                                <div class="text-lg font-bold dark:text-white mt-1">
                                    <a href="/leaderboard/{selectedDay.topTrader.participantId}" class="hover:text-amber-500 transition-colors">
                                        {selectedDay.topTrader.nickname}
                                    </a>
                                </div>
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

                <!-- Desktop Table -->
                <div class="hidden sm:block rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border overflow-hidden animate-fade-in-up stagger-4">
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
                                    <tr class="row-hover {rank <= 3 ? 'font-semibold' : ''}">
                                        <td class="px-4 py-3">
                                            {#if rank === 1}&#x1F947;{:else if rank === 2}&#x1F948;{:else if rank === 3}&#x1F949;{:else}<span class="text-gray-400">#{rank}</span>{/if}
                                        </td>
                                        <td class="px-4 py-3 dark:text-white">
                                            <a href="/leaderboard/{entry.participantId}" class="hover:text-amber-500 transition-colors">{entry.nickname}</a>
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

                <!-- Mobile Card View -->
                <div class="sm:hidden space-y-3 animate-fade-in-up stagger-4">
                    {#each selectedDay.entries as entry, i}
                        {@const rank = i + 1}
                        <a
                            href="/leaderboard/{entry.participantId}"
                            class="block bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-4 card-hover"
                        >
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <span class="text-lg">
                                        {#if rank === 1}&#x1F947;{:else if rank === 2}&#x1F948;{:else if rank === 3}&#x1F949;{:else}<span class="text-sm font-bold text-gray-400">#{rank}</span>{/if}
                                    </span>
                                    <span class="font-semibold dark:text-white">{entry.nickname}</span>
                                </div>
                                <span class="font-bold text-amber-600 dark:text-amber-400">{entry.points.toLocaleString()} pts</span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span class="font-mono font-semibold {entry.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    {formatProfit(entry.profit)}
                                </span>
                                <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                    {#if entry.winRate != null}
                                        <span>WR {entry.winRate.toFixed(1)}%</span>
                                    {/if}
                                    {#if entry.totalTrades != null}
                                        <span>{entry.totalTrades} trades</span>
                                    {/if}
                                </div>
                            </div>
                        </a>
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
</div>
