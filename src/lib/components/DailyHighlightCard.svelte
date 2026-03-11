<script lang="ts">
    import { browser } from '$app/environment';
    import { onDestroy } from 'svelte';

    type TopTrader = {
        nickname: string;
        profit: number;
        points: number;
    } | null;

    type NotableTrade = {
        nickname: string;
        symbol: string;
        type: string;
        lotSize: number;
        profit: number;
        closeTime: string;
    };

    export let highlight = '';
    export let date = '';
    export let topTrader: TopTrader = null;
    export let notableTrades: NotableTrade[] = [];
    export let loading = false;
    export let error = false;

    let plainHighlight = '';
    let typedHighlight = '';
    let typingComplete = false;
    let lastTypingSignature = '';
    let typingTimer: ReturnType<typeof setTimeout> | null = null;

    $: featuredTrades = notableTrades.slice(0, 3);
    $: hasKeyMovers = featuredTrades.length > 0;
    $: {
        const nextSignature = loading || error ? `${loading}:${error}` : highlight;

        if (nextSignature !== lastTypingSignature) {
            lastTypingSignature = nextSignature;

            if (loading || error || !highlight) {
                clearTypingTimer();
                plainHighlight = '';
                typedHighlight = '';
                typingComplete = !highlight;
            } else {
                startTyping(highlight);
            }
        }
    }

    function formatSigned(value: number): string {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
    }

    function formatLots(value: number): string {
        return Number.isInteger(value)
            ? value.toLocaleString()
            : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    function formatCloseTime(value: string): string {
        const dateValue = new Date(value);
        if (Number.isNaN(dateValue.getTime())) return '';

        return new Intl.DateTimeFormat('th-TH', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(dateValue);
    }

    function clearTypingTimer(): void {
        if (!typingTimer) return;
        clearTimeout(typingTimer);
        typingTimer = null;
    }

    function extractHighlightText(markup: string): string {
        if (!markup) return '';

        if (!browser) {
            return markup
                .replace(/<li>/g, '• ')
                .replace(/<[^>]+>/g, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }

        const container = document.createElement('div');
        container.innerHTML = markup;

        container.querySelectorAll('li').forEach((item) => {
            item.innerHTML = `• ${item.innerHTML}`;
        });

        return (container.innerText || container.textContent || '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function shouldReduceMotion(): boolean {
        return browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function startTyping(markup: string): void {
        clearTypingTimer();

        plainHighlight = extractHighlightText(markup);

        if (!plainHighlight) {
            typedHighlight = '';
            typingComplete = true;
            return;
        }

        if (shouldReduceMotion()) {
            typedHighlight = plainHighlight;
            typingComplete = true;
            return;
        }

        typedHighlight = '';
        typingComplete = false;

        const totalChars = plainHighlight.length;
        const chunkSize = Math.max(1, Math.ceil(totalChars / 170));

        const tick = () => {
            const nextLength = Math.min(totalChars, typedHighlight.length + chunkSize);
            typedHighlight = plainHighlight.slice(0, nextLength);

            if (nextLength >= totalChars) {
                typingComplete = true;
                clearTypingTimer();
                return;
            }

            typingTimer = setTimeout(tick, 30);
        };

        typingTimer = setTimeout(tick, 260);
    }

    onDestroy(() => {
        clearTypingTimer();
    });
</script>

<article
    class="daily-highlight-card relative overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-[linear-gradient(145deg,rgba(255,251,235,0.96),rgba(255,255,255,0.88))] p-5 text-slate-900 shadow-[0_24px_80px_-36px_rgba(120,53,15,0.3)] ring-1 ring-white/70 transition-colors duration-300 ease-out animate-fade-in-up stagger-6 sm:p-6"
>
    <div class="pointer-events-none absolute inset-0 daily-highlight-ambient"></div>
    <div class="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"></div>

    <div class="relative z-[1] space-y-4 sm:space-y-5">
        <header class="daily-highlight-header flex flex-col gap-3">
            <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-amber-900">
                    <span class="text-sm leading-none">&#x2728;</span>
                    <span class="typewriter-reveal typewriter-reveal--chip-primary">Highlight of the Day</span>
                </span>
                <span class="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.22em] text-slate-500 backdrop-blur-sm">
                    <span class="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.16)]"></span>
                    <span class="typewriter-reveal typewriter-reveal--chip-secondary">Live Editorial</span>
                </span>
            </div>

            <div class="max-w-3xl">
                <p class="text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-amber-700/90">
                    <span class="typewriter-reveal typewriter-reveal--eyebrow">Market Narrative</span>
                </p>
                <h2 class="mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:text-[2rem]">
                    <span class="typewriter-reveal typewriter-reveal--title">The session&apos;s defining story</span>
                </h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[0.95rem]">
                    <span class="typewriter-reveal typewriter-reveal--deck">Premium recap of the most decisive moves, lead changes, and pressure points from the competition floor.</span>
                </p>
            </div>
        </header>

        {#if loading}
            <div class="daily-highlight-grid">
                <aside class="meta-rail lg:order-2">
                    <section class="meta-rail-card rounded-[1.25rem]">
                        <div class="daily-highlight-shimmer mb-3 h-3 w-24 rounded-full bg-amber-200/80"></div>
                        <div class="daily-highlight-shimmer h-4 w-32 rounded-full bg-slate-200/80"></div>
                    </section>

                    <section class="meta-rail-card rounded-[1.25rem]">
                        <div class="daily-highlight-shimmer mb-3 h-3 w-24 rounded-full bg-amber-200/80"></div>
                        <div class="daily-highlight-shimmer mb-3 h-5 w-36 rounded-full bg-slate-200/85"></div>
                        <div class="daily-highlight-shimmer mb-2 h-4 w-full rounded-full bg-slate-200/75"></div>
                        <div class="daily-highlight-shimmer mb-5 h-4 w-[82%] rounded-full bg-slate-200/65"></div>
                        <div class="daily-highlight-shimmer h-10 w-28 rounded-2xl bg-slate-200/80"></div>
                    </section>
                </aside>

                <div class="daily-highlight-surface narrative-panel lg:order-1">
                    <div class="daily-highlight-shimmer mb-3 h-3 w-28 rounded-full bg-amber-200/80"></div>
                    <div class="daily-highlight-shimmer mb-3 h-4 w-full rounded-full bg-slate-200/85"></div>
                    <div class="daily-highlight-shimmer mb-3 h-4 w-[95%] rounded-full bg-slate-200/75"></div>
                    <div class="daily-highlight-shimmer mb-3 h-4 w-[88%] rounded-full bg-slate-200/70"></div>
                    <div class="daily-highlight-shimmer mb-3 h-4 w-[92%] rounded-full bg-slate-200/65"></div>
                    <div class="daily-highlight-shimmer h-4 w-[72%] rounded-full bg-slate-200/60"></div>
                </div>
            </div>

            <section class="movers-section">
                <div class="mb-4 flex items-center gap-3">
                    <div class="h-px flex-1 bg-gradient-to-r from-amber-300/70 to-transparent"></div>
                    <span class="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-amber-800/90">
                        Key Movers
                    </span>
                </div>

                <div class="movers-grid">
                    {#each Array(3) as _, index}
                        <section class="mover-card rounded-[1.15rem]" aria-hidden="true">
                            <div class="daily-highlight-shimmer mb-3 h-3 w-16 rounded-full bg-amber-200/80"></div>
                            <div class="daily-highlight-shimmer mb-3 h-5 w-24 rounded-full bg-slate-200/85"></div>
                            <div class="daily-highlight-shimmer mb-4 h-4 w-28 rounded-full bg-slate-200/70"></div>
                            <div class="mt-auto flex items-end justify-between gap-3">
                                <div class="daily-highlight-shimmer h-10 w-24 rounded-2xl bg-slate-200/75"></div>
                                <div class="daily-highlight-shimmer h-10 w-20 rounded-2xl bg-slate-200/80"></div>
                            </div>
                        </section>
                    {/each}
                </div>
            </section>
        {:else if error}
            <div class="daily-highlight-grid">
                <aside class="meta-rail lg:order-2">
                    <section class="meta-rail-card rounded-[1.25rem]">
                        <p class="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Session Date
                        </p>
                        <p class="mt-2 font-semibold text-slate-900">{date || 'Awaiting update'}</p>
                    </section>

                    <section class="meta-rail-card rounded-[1.25rem]">
                        <p class="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amber-900/80">
                            Editorial Desk
                        </p>
                        <p class="mt-2 text-base font-semibold text-slate-950">
                            Fallback mode active
                        </p>
                        <p class="mt-2 text-sm leading-6 text-slate-600">
                            Data is still flowing. The editorial recap will return once the next market summary is ready.
                        </p>
                    </section>
                </aside>

                <div class="daily-highlight-surface narrative-panel lg:order-1">
                    <p class="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-amber-700/90">
                        Editorial Desk
                    </p>
                    <p class="mt-3 text-lg font-semibold text-slate-900">
                        Today&apos;s premium highlight is temporarily offline.
                    </p>
                    <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[0.98rem]">
                        The story module is waiting for the next valid summary payload. Once it arrives, this section will return in the same layout without shifting the surrounding page.
                    </p>
                </div>
            </div>
        {:else}
            <div class="daily-highlight-grid">
                <aside class="meta-rail lg:order-2">
                    <section class="meta-rail-card rounded-[1.25rem]">
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8.25 3.75h7.5M9.75 3.75v2.5m4.5-2.5v2.5M5.25 8.25h13.5m-12 0v10.5a1.5 1.5 0 001.5 1.5h7.5a1.5 1.5 0 001.5-1.5V8.25" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Session Date
                                </p>
                                <p class="mt-1 font-semibold text-slate-900">{date || 'Awaiting update'}</p>
                            </div>
                        </div>
                    </section>

                    {#if topTrader}
                        <section class="meta-rail-card lead-card rounded-[1.25rem]">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <p class="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amber-900/80">
                                        Lead Trader
                                    </p>
                                    <h3 class="mt-2 text-xl font-semibold text-slate-950">
                                        {topTrader.nickname}
                                    </h3>
                                </div>
                                <div class="rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-amber-900">
                                    {topTrader.points} pts
                                </div>
                            </div>

                            <p class="mt-3 text-sm leading-6 text-slate-600">
                                Holding the strongest line on today&apos;s board with {topTrader.points} points.
                            </p>

                            <div class="mt-4 rounded-2xl border border-white/70 bg-white/72 px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)]">
                                <p class:text-emerald-600={topTrader.profit >= 0} class:text-rose-600={topTrader.profit < 0} class="text-lg font-semibold tabular-nums">
                                    {formatSigned(topTrader.profit)}
                                </p>
                                <p class="mt-1 text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
                                    Profit
                                </p>
                            </div>
                        </section>
                    {/if}
                </aside>

                <div class="daily-highlight-surface narrative-panel lg:order-1">
                    <div class="highlight-prose max-w-none text-[0.98rem] leading-8 text-slate-700 sm:text-[1.02rem]">
                        {#if typingComplete}
                            {@html highlight}
                        {:else}
                            <div class="highlight-typing" aria-live="polite">
                                {typedHighlight}<span class="typing-caret" aria-hidden="true"></span>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            {#if hasKeyMovers}
                <section class="movers-section">
                    <div class="mb-4 flex items-center gap-3">
                        <div class="h-px flex-1 bg-gradient-to-r from-amber-300/70 to-transparent"></div>
                        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-amber-800/90">
                            Key Movers
                        </span>
                    </div>

                    <div class="movers-grid">
                        {#each featuredTrades as trade}
                            <section class="mover-card rounded-[1.15rem]">
                                <div class="flex items-start justify-between gap-3">
                                    <div>
                                        <p class="text-[0.66rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
                                            {trade.type}
                                        </p>
                                        <h3 class="mt-2 text-base font-semibold text-slate-900">
                                            {trade.symbol}
                                        </h3>
                                    </div>
                                    <span class="rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white"
                                        class:bg-emerald-600={trade.profit >= 0}
                                        class:bg-rose-600={trade.profit < 0}>
                                        {trade.profit >= 0 ? 'Gain' : 'Drawdown'}
                                    </span>
                                </div>

                                <p class="mt-4 truncate text-sm font-medium text-slate-700">{trade.nickname}</p>

                                <div class="mt-auto pt-5">
                                    <div class="flex items-end justify-between gap-3">
                                        <div>
                                            <p class="text-xs uppercase tracking-[0.22em] text-slate-400">Size</p>
                                            <p class="mt-1 text-sm font-semibold text-slate-800">
                                                {formatLots(trade.lotSize)} lots
                                            </p>
                                        </div>
                                        <div class="text-right">
                                            <p class:text-emerald-600={trade.profit >= 0} class:text-rose-600={trade.profit < 0} class="text-base font-semibold tabular-nums">
                                                {formatSigned(trade.profit)}
                                            </p>
                                            {#if formatCloseTime(trade.closeTime)}
                                                <p class="mt-1 text-xs text-slate-400">
                                                    {formatCloseTime(trade.closeTime)}
                                                </p>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        {/each}
                    </div>
                </section>
            {/if}
        {/if}
    </div>
</article>

<style>
    .daily-highlight-card {
        isolation: isolate;
    }

    :global(.dark) .daily-highlight-card {
        border-color: rgba(217, 119, 6, 0.24);
        background:
            radial-gradient(circle at top left, rgba(251, 191, 36, 0.1), transparent 32%),
            linear-gradient(145deg, rgba(24, 24, 27, 0.96), rgba(10, 10, 10, 0.94));
        box-shadow: 0 28px 90px -40px rgba(0, 0, 0, 0.82);
    }

    .daily-highlight-ambient {
        background:
            radial-gradient(circle at top left, rgba(251, 191, 36, 0.2), transparent 34%),
            radial-gradient(circle at 82% 18%, rgba(148, 163, 184, 0.14), transparent 26%),
            linear-gradient(120deg, rgba(255, 255, 255, 0.06), transparent 36%);
    }

    :global(.dark) .daily-highlight-ambient {
        background:
            radial-gradient(circle at top left, rgba(251, 191, 36, 0.12), transparent 34%),
            radial-gradient(circle at 84% 20%, rgba(250, 204, 21, 0.07), transparent 22%),
            linear-gradient(120deg, rgba(255, 255, 255, 0.03), transparent 34%);
    }

    .daily-highlight-header {
        max-width: 52rem;
    }

    .daily-highlight-grid {
        display: grid;
        gap: 1rem;
        align-items: start;
    }

    @media (min-width: 1024px) {
        .daily-highlight-grid {
            grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 0.82fr);
            gap: 1.1rem;
        }
    }

    .daily-highlight-surface {
        position: relative;
        overflow: hidden;
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 251, 235, 0.5)),
            rgba(255, 255, 255, 0.34);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 24px 60px -42px rgba(15, 23, 42, 0.28);
        backdrop-filter: blur(16px);
    }

    :global(.dark) .daily-highlight-surface {
        border-color: rgba(255, 255, 255, 0.07);
        background:
            linear-gradient(180deg, rgba(39, 39, 42, 0.84), rgba(17, 24, 39, 0.72)),
            rgba(15, 23, 42, 0.5);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 24px 60px -42px rgba(0, 0, 0, 0.88);
    }

    .narrative-panel {
        border: 1px solid rgba(255, 255, 255, 0.72);
        border-radius: 1.5rem;
        padding: 1.35rem;
    }

    .meta-rail {
        display: grid;
        gap: 0.85rem;
        align-content: start;
    }

    .meta-rail-card {
        border: 1px solid rgba(255, 255, 255, 0.75);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 251, 235, 0.42)),
            rgba(255, 255, 255, 0.3);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.85),
            0 18px 40px -34px rgba(15, 23, 42, 0.26);
        backdrop-filter: blur(14px);
        padding: 1rem;
    }

    :global(.dark) .meta-rail-card {
        border-color: rgba(255, 255, 255, 0.06);
        background:
            linear-gradient(180deg, rgba(39, 39, 42, 0.8), rgba(17, 24, 39, 0.68)),
            rgba(15, 23, 42, 0.46);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.03),
            0 18px 40px -34px rgba(0, 0, 0, 0.85);
    }

    .lead-card {
        background:
            radial-gradient(circle at top left, rgba(251, 191, 36, 0.14), transparent 46%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(255, 251, 235, 0.48)),
            rgba(255, 255, 255, 0.32);
    }

    :global(.dark) .lead-card {
        background:
            radial-gradient(circle at top left, rgba(251, 191, 36, 0.08), transparent 44%),
            linear-gradient(180deg, rgba(39, 39, 42, 0.82), rgba(17, 24, 39, 0.7)),
            rgba(15, 23, 42, 0.46);
    }

    .movers-section {
        border-top: 1px solid rgba(252, 211, 77, 0.28);
        padding-top: 1.2rem;
    }

    .movers-grid {
        display: grid;
        gap: 0.85rem;
        grid-template-columns: minmax(0, 1fr);
    }

    @media (min-width: 640px) {
        .movers-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (min-width: 1024px) {
        .movers-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }

    .mover-card {
        display: flex;
        min-height: 100%;
        flex-direction: column;
        border: 1px solid rgba(255, 255, 255, 0.72);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 250, 240, 0.52)),
            rgba(255, 255, 255, 0.28);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.82),
            0 14px 32px -28px rgba(15, 23, 42, 0.26);
        padding: 1rem;
    }

    :global(.dark) .mover-card {
        border-color: rgba(255, 255, 255, 0.06);
        background:
            linear-gradient(160deg, rgba(39, 39, 42, 0.82), rgba(17, 24, 39, 0.64)),
            rgba(15, 23, 42, 0.44);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.03),
            0 14px 32px -28px rgba(0, 0, 0, 0.9);
    }

    .daily-highlight-shimmer {
        position: relative;
        overflow: hidden;
    }

    .daily-highlight-shimmer::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.58), transparent);
        transform: translateX(-100%);
        animation: skeletonSweep 1.6s ease-in-out infinite;
    }

    :global(.dark) .daily-highlight-shimmer::after {
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.14), transparent);
    }

    .highlight-prose {
        max-width: 68ch;
    }

    .highlight-typing {
        white-space: pre-wrap;
    }

    .typewriter-reveal {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        clip-path: inset(0 100% 0 0);
        animation-name: typeRevealClip;
        animation-duration: 900ms;
        animation-timing-function: steps(28, end);
        animation-fill-mode: forwards;
    }

    .typewriter-reveal--chip-primary {
        animation-delay: 60ms;
        animation-duration: 520ms;
        animation-timing-function: steps(18, end);
    }

    .typewriter-reveal--chip-secondary {
        animation-delay: 540ms;
        animation-duration: 540ms;
        animation-timing-function: steps(16, end);
    }

    .typewriter-reveal--eyebrow {
        animation-delay: 1080ms;
        animation-duration: 460ms;
        animation-timing-function: steps(20, end);
    }

    .typewriter-reveal--title {
        animation-delay: 1500ms;
        animation-duration: 980ms;
        animation-timing-function: steps(34, end);
    }

    .typewriter-reveal--deck {
        animation-delay: 2360ms;
        animation-duration: 1220ms;
        animation-timing-function: steps(48, end);
    }

    .typing-caret {
        display: inline-block;
        width: 0.7ch;
        height: 1.05em;
        margin-left: 0.1rem;
        border-right: 2px solid currentColor;
        transform: translateY(0.18em);
        animation: highlightCaret 0.95s steps(1, end) infinite;
    }

    .highlight-prose :global(p) {
        margin: 0 0 0.9rem;
    }

    .highlight-prose :global(p:last-child) {
        margin-bottom: 0;
    }

    .highlight-prose :global(strong) {
        color: #0f172a;
        font-weight: 700;
    }

    .highlight-prose :global(ul),
    .highlight-prose :global(ol) {
        margin: 0.75rem 0;
        padding-left: 1.2rem;
    }

    .highlight-prose :global(li) {
        margin-bottom: 0.45rem;
        padding-left: 0.2rem;
    }

    .highlight-prose :global(li::marker) {
        color: rgba(180, 83, 9, 0.88);
    }

    .highlight-prose :global(em) {
        color: #92400e;
        font-style: normal;
    }

    :global(.dark) .highlight-prose {
        color: rgba(226, 232, 240, 0.92);
    }

    :global(.dark) .highlight-prose :global(strong) {
        color: #f8fafc;
    }

    :global(.dark) .highlight-prose :global(li::marker) {
        color: rgba(251, 191, 36, 0.9);
    }

    :global(.dark) .highlight-prose :global(em) {
        color: rgba(252, 211, 77, 0.92);
    }

    :global(.dark) .daily-highlight-card .text-slate-900,
    :global(.dark) .daily-highlight-card .text-slate-950 {
        color: #f8fafc !important;
    }

    :global(.dark) .daily-highlight-card .text-slate-800 {
        color: #e2e8f0 !important;
    }

    :global(.dark) .daily-highlight-card .text-slate-700,
    :global(.dark) .daily-highlight-card .text-slate-600 {
        color: rgba(203, 213, 225, 0.88) !important;
    }

    :global(.dark) .daily-highlight-card .text-slate-500,
    :global(.dark) .daily-highlight-card .text-slate-400 {
        color: rgba(148, 163, 184, 0.92) !important;
    }

    @keyframes skeletonSweep {
        to {
            transform: translateX(100%);
        }
    }

    @keyframes typeRevealClip {
        from {
            clip-path: inset(0 100% 0 0);
        }

        to {
            clip-path: inset(0 0 0 0);
        }
    }

    @keyframes highlightCaret {
        0%,
        49% {
            opacity: 1;
        }

        50%,
        100% {
            opacity: 0;
        }
    }

    @media (max-width: 640px) {
        .highlight-prose {
            max-width: 100%;
        }

        .narrative-panel,
        .meta-rail-card,
        .mover-card {
            padding: 0.95rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .daily-highlight-card,
        .daily-highlight-shimmer::after,
        .typewriter-reveal {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            clip-path: none !important;
        }

        .typing-caret {
            animation: none !important;
        }
    }
</style>
