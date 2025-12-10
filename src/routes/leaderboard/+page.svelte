<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import LeaderboardTable from "$lib/components/LeaderboardTable.svelte";
    import PullToRefresh from "$lib/components/PullToRefresh.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;

    let isRefreshing = false;

    async function handleRefresh() {
        isRefreshing = true;
        await invalidateAll();
        // Add small delay for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 500));
        isRefreshing = false;
    }
</script>

<PullToRefresh {isRefreshing} on:refresh={handleRefresh}>
    <div
        class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8"
    >
        <div class="max-w-4xl mx-auto">
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

                <a
                    href="/"
                    class="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                    &larr; Back to Home
                </a>
            </div>

            <div class="bg-white dark:bg-dark-surface rounded-lg shadow">
                <LeaderboardTable data={data.leaderboard} />
            </div>
        </div>
    </div>
</PullToRefresh>
