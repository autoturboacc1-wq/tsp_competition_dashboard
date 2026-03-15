<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import { supabase } from "$lib/supabase";
    import { ASYNC_COPY } from "$lib/async-state";
    import LeaderboardSkeleton from "$lib/components/LeaderboardSkeleton.svelte";
    import LeaderboardTable from "$lib/components/LeaderboardTable.svelte";
    import HeadToHeadModal from "$lib/components/HeadToHeadModal.svelte";
    import PullToRefresh from "$lib/components/PullToRefresh.svelte";
    import StatusBanner from "$lib/components/StatusBanner.svelte";
    import TopWinners from "$lib/components/TopWinners.svelte";
    import MultiEquityChart from "$lib/components/MultiEquityChart.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;

    let isRefreshing = false;
    let refreshError: string | null = null;
    let showH2H = false;
    type LeaderboardEntry = PageData["leaderboard"][number];
    type ChartTrader = { id: string; nickname: string };

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    onMount(() => {
        realtimeChannel = supabase
            .channel('leaderboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats' }, () => invalidateAll())
            .subscribe();
    });

    onDestroy(() => {
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    });

    $: hasLeaderboardData = data.leaderboard.length > 0;
    $: chartTraders = data.leaderboard.map((t: LeaderboardEntry): ChartTrader => ({ id: t.id, nickname: t.nickname }));

    async function handleRefresh() {
        isRefreshing = true;
        refreshError = null;

        try {
            await invalidateAll();
            await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
            console.error("Failed to refresh leaderboard:", error);
            refreshError = "ไม่สามารถอัปเดตตารางคะแนนได้ในขณะนี้";
        } finally {
            isRefreshing = false;
        }
    }
</script>

<PullToRefresh {isRefreshing} on:refresh={handleRefresh}>
    <div
        class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8"
    >
        <div class="max-w-4xl mx-auto">
            <div class="mb-4 space-y-3">
                {#if isRefreshing}
                    <StatusBanner
                        tone="info"
                        compact
                        title={ASYNC_COPY.refreshing}
                        message="กำลังดึงข้อมูลล่าสุด โดยยังคงแสดงข้อมูลเดิมไว้"
                    />
                {/if}

                {#if refreshError}
                    <StatusBanner
                        tone="error"
                        title="อัปเดตข้อมูลไม่สำเร็จ"
                        message={refreshError}
                        actionLabel={ASYNC_COPY.retry}
                        on:action={handleRefresh}
                    />
                {/if}

                {#if data.isFallbackData}
                    <StatusBanner
                        tone="warning"
                        title={ASYNC_COPY.fallback}
                        message={data.loadError ||
                            "ข้อมูลล่าสุดโหลดไม่สำเร็จ จึงแสดงข้อมูลสำรองแทน"}
                    />
                {:else if data.loadError}
                    <StatusBanner
                        tone="error"
                        title="โหลดข้อมูลไม่สำเร็จ"
                        message={data.loadError}
                        actionLabel={ASYNC_COPY.retry}
                        on:action={handleRefresh}
                    />
                {/if}
            </div>

            <div
                class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4"
            >
                <div>
                    <h1
                        class="text-3xl font-bold text-gray-900 dark:text-white"
                    >
                        Leaderboard
                    </h1>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-300">
                        Top traders ranked by points and profit.
                    </p>
                </div>

                <div class="flex items-center gap-4">
                    <button
                        on:click={() => (showH2H = true)}
                        class="px-5 py-2 border border-amber-500/30 hover:border-amber-400/60 bg-transparent hover:bg-amber-500/8 text-amber-400/80 hover:text-amber-300 text-xs font-medium tracking-[0.12em] uppercase transition-all duration-300"
                    >
                        VS Head-to-Head
                    </button>
                    <a
                        href="/"
                        class="text-xs font-light tracking-[0.1em] uppercase text-gray-500 hover:text-gray-300 flex items-center gap-1.5 transition-colors duration-300"
                    >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" /></svg>
                        Home
                    </a>
                </div>
            </div>

            {#if isRefreshing && !hasLeaderboardData}
                <LeaderboardSkeleton />
            {:else if hasLeaderboardData}
                <TopWinners data={data.leaderboard} />

                <LeaderboardTable data={data.leaderboard} />

                <div class="mt-6">
                    <MultiEquityChart traders={chartTraders} />
                </div>
            {:else}
                <div
                    class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm dark:border-dark-border dark:bg-dark-surface"
                >
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                        {ASYNC_COPY.empty}
                    </h2>
                    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        ยังไม่มีผู้เข้าแข่งขันในตารางคะแนนตอนนี้
                    </p>
                </div>
            {/if}
        </div>
    </div>
</PullToRefresh>

<HeadToHeadModal bind:show={showH2H} traders={data.leaderboard} />
