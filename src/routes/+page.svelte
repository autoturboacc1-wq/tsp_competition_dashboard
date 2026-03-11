<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { invalidateAll } from '$app/navigation';
    import { supabase } from '$lib/supabase';
    import { marked } from 'marked';
    import DOMPurify from 'isomorphic-dompurify';
    import PullToRefresh from '$lib/components/PullToRefresh.svelte';
    import DailyHighlightCard from '$lib/components/DailyHighlightCard.svelte';
    import RecentTradesFeed from '$lib/components/RecentTradesFeed.svelte';
    import NotificationSettings from '$lib/components/NotificationSettings.svelte';

    export let data;

    type DailyHighlight = {
        highlight: string;
        date: string;
        topTrader: {
            nickname: string;
            profit: number;
            points: number;
        } | null;
        notableTrades: Array<{
            nickname: string;
            symbol: string;
            type: string;
            lotSize: number;
            profit: number;
            closeTime: string;
        }>;
    };

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let dailyHighlight: DailyHighlight | null = null;
    let dailyHighlightHtml = '';
    let highlightLoading = true;
    let highlightError = false;

    function renderMarkdown(text: string): string {
        const raw = marked.parse(text, { async: false }) as string;
        return DOMPurify.sanitize(raw);
    }

    async function fetchDailyHighlight() {
        try {
            highlightLoading = true;
            highlightError = false;
            const res = await fetch('/api/daily-highlight');
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            if (json.success) {
                dailyHighlight = json as DailyHighlight;
            } else {
                highlightError = true;
            }
        } catch {
            highlightError = true;
        } finally {
            highlightLoading = false;
        }
    }

    onMount(() => {
        realtimeChannel = supabase
            .channel('dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats' }, () => invalidateAll())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => invalidateAll())
            .subscribe();

        fetchDailyHighlight();
    });

    onDestroy(() => {
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    });

    $: ({ summary, topPerformer, recentTrades, competition, topFive } = data);
    $: dailyHighlightHtml = dailyHighlight?.highlight ? renderMarkdown(dailyHighlight.highlight) : '';

    function formatNumber(n: number): string {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toLocaleString();
    }
</script>

<svelte:head>
    <title>Dashboard | EliteGold</title>
</svelte:head>

<PullToRefresh on:refresh={() => invalidateAll()}>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <!-- Page Header -->
        <div class="mb-6 sm:mb-8 animate-fade-in-down">
            <h1 class="text-2xl sm:text-3xl font-bold dark:text-white">
                Competition <span class="text-gold">Dashboard</span>
            </h1>
            {#if competition.startDate}
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Day {competition.totalDays} of competition
                </p>
            {/if}
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div class="summary-card p-4 sm:p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up stagger-1">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </div>
                <div class="text-2xl sm:text-3xl font-bold dark:text-white">{summary.totalParticipants}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Participants</div>
            </div>

            <div class="summary-card p-4 sm:p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up stagger-2">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                </div>
                <div class="text-2xl sm:text-3xl font-bold dark:text-white">{formatNumber(summary.totalTrades)}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Trades</div>
            </div>

            <div class="summary-card p-4 sm:p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up stagger-3">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                </div>
                <div class="text-2xl sm:text-3xl font-bold dark:text-white">{summary.totalVolume}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Lots</div>
            </div>

            <div class="summary-card p-4 sm:p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up stagger-4">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div class="text-2xl sm:text-3xl font-bold dark:text-white">{summary.averageWinRate}%</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avg Win Rate</div>
            </div>
        </div>

        <!-- Main Content: Two Column Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column (2/3) -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Top Performer -->
                {#if topPerformer}
                    <a
                        href="/leaderboard/{topPerformer.participantId}"
                        class="block p-5 rounded-xl border-2 border-amber-400/30 dark:border-amber-500/20 top-performer-card animate-fade-in-up stagger-5"
                    >
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                {topPerformer.isToday ? 'Top Performer Today' : `Top Performer · ${topPerformer.date}`}
                            </span>
                            <span class="text-lg">&#x1F3C6;</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-xl font-bold dark:text-white">{topPerformer.nickname}</div>
                                <div class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {topPerformer.points} points
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-bold {topPerformer.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    {topPerformer.profit >= 0 ? '+' : ''}{topPerformer.profit.toFixed(2)}
                                </div>
                                <div class="text-xs text-gray-400">profit</div>
                            </div>
                        </div>
                    </a>
                {/if}

                <!-- Highlight of the Day -->
                <DailyHighlightCard
                    loading={highlightLoading}
                    error={highlightError}
                    highlight={dailyHighlightHtml}
                    date={dailyHighlight?.date || ''}
                    topTrader={dailyHighlight?.topTrader || null}
                    notableTrades={dailyHighlight?.notableTrades || []}
                />

                <!-- Recent Trades -->
                <div class="animate-fade-in-up stagger-6">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-lg font-semibold dark:text-white">Recent Trades</h2>
                        <a href="/trades" class="text-xs text-gold hover:underline">View All</a>
                    </div>
                    <RecentTradesFeed trades={recentTrades} />
                </div>
            </div>

            <!-- Right Column (1/3) -->
            <div class="space-y-6">
                <!-- Competition Stats -->
                <div class="p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up stagger-5">
                    <h2 class="text-lg font-semibold dark:text-white mb-4">Competition Stats</h2>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-500 dark:text-gray-400">Duration</span>
                            <span class="text-sm font-medium dark:text-white">{competition.totalDays} days</span>
                        </div>
                        <div class="border-t border-gray-100 dark:border-dark-border"></div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-500 dark:text-gray-400">Start Date</span>
                            <span class="text-sm font-medium dark:text-white">{competition.startDate}</span>
                        </div>
                        {#if competition.mostActiveTrader}
                            <div class="border-t border-gray-100 dark:border-dark-border"></div>
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-500 dark:text-gray-400">Most Active</span>
                                <span class="text-sm font-medium dark:text-white">
                                    {competition.mostActiveTrader.nickname}
                                    <span class="text-gray-400 dark:text-gray-500 text-xs ml-1">
                                        ({competition.mostActiveTrader.totalTrades})
                                    </span>
                                </span>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Mini Leaderboard -->
                <div class="p-5 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up stagger-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold dark:text-white">Top 5</h2>
                        <a href="/leaderboard" class="text-xs text-gold hover:underline">Full Ranking</a>
                    </div>

                    {#if topFive.length > 0}
                        <div class="space-y-2">
                            {#each topFive as player, i}
                                <a
                                    href="/leaderboard/{player.id}"
                                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <span class="w-6 text-center text-sm font-bold {i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-400 dark:text-gray-500'}">
                                        {i + 1}
                                    </span>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-medium truncate dark:text-white">{player.nickname}</div>
                                        <div class="text-xs text-gray-400">{player.points} pts</div>
                                    </div>
                                    <span class="text-sm font-semibold tabular-nums {player.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                        {player.profit >= 0 ? '+' : ''}{player.profit.toFixed(2)}
                                    </span>
                                </a>
                            {/each}
                        </div>
                    {:else}
                        <div class="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
                            No data yet
                        </div>
                    {/if}
                </div>

                <!-- Push Notifications -->
                <div class="animate-fade-in-up stagger-6">
                    <NotificationSettings vapidPublicKey={data.vapidPublicKey || ''} />
                </div>
            </div>
        </div>

        <!-- Empty state if no data at all -->
        {#if summary.totalParticipants === 0 && topFive.length === 0}
            <div class="text-center py-16 animate-fade-in">
                <div class="text-4xl mb-4">&#x1F3C6;</div>
                <h2 class="text-xl font-semibold dark:text-white mb-2">Competition data will appear once trading begins</h2>
                <p class="text-gray-500 dark:text-gray-400">Stay tuned for live updates</p>
            </div>
        {/if}
    </div>
</PullToRefresh>

<style>
    .summary-card {
        border-top: 2px solid transparent;
        border-image: linear-gradient(90deg, #f59e0b, #d97706) 1;
        border-image-slice: 1 0 0 0;
    }

    .top-performer-card {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
    }

    :global(.dark) .top-performer-card {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 17, 17, 0.5) 100%);
    }
</style>
