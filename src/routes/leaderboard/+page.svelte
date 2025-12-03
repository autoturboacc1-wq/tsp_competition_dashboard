<script lang="ts">
    import LeaderboardTable from "$lib/components/LeaderboardTable.svelte";
    import { leaderboardData } from "$lib/mock/leaderboard";
</script>

<div class="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
        <div
            class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4"
        >
            <div>
                <h1 class="text-3xl font-bold text-gray-900">Leaderboard</h1>
                <p class="mt-1 text-sm text-gray-500">
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

        <div class="bg-white rounded-lg shadow">
            <LeaderboardTable data={leaderboardData} />
        </div>
    </div>
</div>
