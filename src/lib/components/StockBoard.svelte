<script lang="ts">
    import { flip } from 'svelte/animate';

    export let participants: Array<{
        rank: number;
        id: string;
        nickname: string;
        profit: number;
        winRate: number;
        points: number;
    }> = [];

    let flashStates = new Map<string, 'green' | 'red'>();
    let prevProfits = new Map<string, number>();

    $: {
        for (const p of participants) {
            const prev = prevProfits.get(p.id);
            if (prev !== undefined && prev !== p.profit) {
                const dir: 'green' | 'red' = p.profit > prev ? 'green' : 'red';
                flashStates = new Map(flashStates).set(p.id, dir);
                setTimeout(() => {
                    const next = new Map(flashStates);
                    next.delete(p.id);
                    flashStates = next;
                }, 700);
            }
            prevProfits.set(p.id, p.profit);
        }
    }

    function rowClass(p: typeof participants[0]): string {
        const flash = flashStates.get(p.id);
        if (flash === 'green') return 'flash-green';
        if (flash === 'red') return 'flash-red';
        if (p.profit > 0) return 'row-green';
        if (p.profit < 0) return 'row-red';
        return '';
    }

    function rankIcon(rank: number): string {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    }
</script>

<div class="rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border overflow-hidden">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border">
        <h2 class="text-sm font-semibold dark:text-white uppercase tracking-wider">Leaderboard</h2>
        <a href="/leaderboard" class="text-xs text-gold hover:underline">Full Ranking →</a>
    </div>

    <div class="grid grid-cols-[32px_1fr_auto_auto_auto] gap-x-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-50 dark:border-dark-border">
        <span></span>
        <span>TRADER</span>
        <span class="text-right">PROFIT</span>
        <span class="text-right hidden sm:block">W%</span>
        <span class="text-right">PTS</span>
    </div>

    {#if participants.length > 0}
        <div class="divide-y divide-gray-50 dark:divide-dark-border max-h-[420px] overflow-y-auto">
            {#each participants as p (p.id)}
                <a
                    href="/leaderboard/{p.id}"
                    class="board-row grid grid-cols-[32px_1fr_auto_auto_auto] gap-x-2 items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors {rowClass(p)}"
                    animate:flip={{ duration: 300 }}
                >
                    <span class="text-center text-xs font-bold {p.rank <= 3 ? '' : 'text-gray-400 dark:text-gray-500'}">{rankIcon(p.rank)}</span>
                    <span class="text-sm font-medium truncate dark:text-white">{p.nickname}</span>
                    <span class="text-sm font-mono tabular-nums {p.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                        {p.profit >= 0 ? '▲' : '▼'} {p.profit >= 0 ? '+' : ''}{p.profit.toFixed(2)}
                    </span>
                    <span class="text-xs font-mono tabular-nums hidden sm:block {p.winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'} text-right">
                        {p.winRate.toFixed(0)}%
                    </span>
                    <span class="text-xs font-mono tabular-nums text-amber-500 dark:text-amber-400 text-right">
                        {p.points.toLocaleString()}
                    </span>
                </a>
            {/each}
        </div>
    {:else}
        <div class="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">No data yet</div>
    {/if}
</div>

<style>
    .row-green { background: rgba(34, 197, 94, 0.04); }
    .row-red   { background: rgba(239, 68, 68, 0.04); }

    :global(.dark) .row-green { background: rgba(34, 197, 94, 0.07); }
    :global(.dark) .row-red   { background: rgba(239, 68, 68, 0.07); }

    @keyframes flash-green {
        0%, 100% { background: transparent; }
        40% { background: rgba(34, 197, 94, 0.25); }
    }

    @keyframes flash-red {
        0%, 100% { background: transparent; }
        40% { background: rgba(239, 68, 68, 0.25); }
    }

    .flash-green { animation: flash-green 0.7s ease; }
    .flash-red   { animation: flash-red 0.7s ease; }
</style>
