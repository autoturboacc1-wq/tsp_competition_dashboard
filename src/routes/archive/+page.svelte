<script lang="ts">
    import type { PageData } from './$types';

    export let data: PageData;

    $: competitions = data.competitions || [];

    function getStatusBadge(status: string) {
        switch (status) {
            case 'active': return { text: 'Active', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
            case 'completed': return { text: 'Completed', class: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' };
            case 'upcoming': return { text: 'Upcoming', class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
            default: return { text: status, class: 'bg-gray-100 text-gray-600' };
        }
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
</script>

<svelte:head>
    <title>Competition Archive | EliteGold</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
        <div class="mb-8 animate-fade-in-down">
            <h1 class="text-3xl font-bold dark:text-white">
                Competition <span class="text-gold">Archive</span>
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Browse past and current competition rounds
            </p>
        </div>

        {#if competitions.length === 0}
            <div class="text-center py-16 animate-fade-in">
                <div class="text-4xl mb-4">&#x1F3C6;</div>
                <h2 class="text-xl font-semibold dark:text-white mb-2">No competitions yet</h2>
                <p class="text-gray-500 dark:text-gray-400">Competition rounds will appear here once created</p>
            </div>
        {:else}
            <div class="space-y-4">
                {#each competitions as comp, i}
                    {@const badge = getStatusBadge(comp.status)}
                    <div class="bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up card-hover"
                         style="animation-delay: {i * 50}ms">
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="flex items-center gap-3">
                                    <h2 class="text-lg font-bold dark:text-white">{comp.name}</h2>
                                    <span class="px-2 py-0.5 text-xs font-semibold rounded-full {badge.class}">
                                        {badge.text}
                                    </span>
                                </div>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDate(comp.start_date)} - {formatDate(comp.end_date)}
                                </p>
                            </div>
                            {#if comp.status === 'active'}
                                <a href="/leaderboard" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors">
                                    View Live
                                </a>
                            {:else if comp.status === 'completed'}
                                <a href="/leaderboard?competition={comp.id}" class="px-4 py-2 bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
                                    View Results
                                </a>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
