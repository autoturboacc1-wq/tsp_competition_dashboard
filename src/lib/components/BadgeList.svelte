<script lang="ts">
    export let badges: Array<{
        badge_type: string;
        badge_label: string;
        description: string;
        earned_at: string;
    }> = [];

    const badgeEmojis: Record<string, string> = {
        first_trade: '🎯',
        streak_5: '🔥',
        streak_10: '💥',
        trades_50: '⚔️',
        trades_100: '🤖',
        profit_1000: '💰',
        win_rate_70: '🎯',
        low_dd_5: '🛡️',
        best_day: '🏆',
    };

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
</script>

{#if badges.length > 0}
    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {#each badges as badge}
            <div
                class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-gradient-to-r from-yellow-50 to-amber-50
                       dark:from-yellow-900/20 dark:to-amber-900/20
                       border border-yellow-200 dark:border-yellow-700/50
                       shadow-sm hover:shadow-md transition-shadow cursor-default"
                title={badge.description}
            >
                <span class="text-lg">{badgeEmojis[badge.badge_type] || '🏅'}</span>
                <span class="text-xs font-semibold text-yellow-800 dark:text-yellow-300 whitespace-nowrap">
                    {badge.badge_label}
                </span>
                <span class="text-[10px] text-yellow-600/70 dark:text-yellow-400/60 whitespace-nowrap">
                    {formatDate(badge.earned_at)}
                </span>
            </div>
        {/each}
    </div>
{/if}

<style>
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
