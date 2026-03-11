<script lang="ts">
    import { onMount, tick } from 'svelte';

    export let participants: Array<{
        rank: number;
        id: string;
        nickname: string;
        profit: number;
        points: number;
    }> = [];

    let trackEl: HTMLElement;
    let duration = 30;

    onMount(async () => {
        await tick();
        if (trackEl && trackEl.scrollWidth > 0) {
            duration = (trackEl.scrollWidth / 2) / 60; // 60px/s
        }
    });

    function fmt(n: number): string {
        return (n >= 0 ? '+' : '') + n.toFixed(2);
    }
</script>

{#if participants.length > 0}
<div class="ticker-wrap">
    <div class="ticker-label">
        <span class="live-dot"></span>LIVE
    </div>
    <div class="ticker-track" bind:this={trackEl} style="--duration: {duration}s">
        {#each [participants, participants] as copy, ci}
            {#each copy as p}
                <a
                    href="/leaderboard/{p.id}"
                    class="ticker-item"
                    aria-hidden={ci === 1 ? 'true' : undefined}
                    tabindex={ci === 1 ? -1 : 0}
                >
                    <span class="t-rank">#{p.rank}</span>
                    <span class="t-name">{p.nickname}</span>
                    <span class={p.profit >= 0 ? 'up' : 'down'}>
                        {p.profit >= 0 ? '▲' : '▼'} {fmt(p.profit)}
                    </span>
                    <span class="sep">|</span>
                </a>
            {/each}
        {/each}
    </div>
</div>
{/if}

<style>
    .ticker-wrap {
        height: 38px;
        overflow: hidden;
        background: #080808;
        border-bottom: 1px solid #2a2a2a;
        display: flex;
        align-items: center;
        user-select: none;
    }

    .ticker-label {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 14px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #ef4444;
        border-right: 1px solid #2a2a2a;
        height: 100%;
    }

    .live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ef4444;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    .ticker-track {
        display: flex;
        align-items: center;
        white-space: nowrap;
        animation: ticker-scroll var(--duration, 30s) linear infinite;
        will-change: transform;
    }

    .ticker-track:hover {
        animation-play-state: paused;
    }

    @keyframes ticker-scroll {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
    }

    .ticker-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 0 18px;
        font-size: 12px;
        font-family: 'IBM Plex Mono', monospace;
        color: #e5e5e5;
        text-decoration: none;
        transition: opacity 0.15s;
    }

    .ticker-item:hover {
        opacity: 0.65;
    }

    .t-rank {
        color: #6b7280;
        font-size: 10px;
    }

    .t-name {
        font-weight: 600;
        color: #f5f5f5;
    }

    .up   { color: #22c55e; }
    .down { color: #ef4444; }

    .sep {
        color: #333;
        padding: 0 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        .ticker-track {
            animation: none;
            overflow-x: auto;
        }
    }
</style>
