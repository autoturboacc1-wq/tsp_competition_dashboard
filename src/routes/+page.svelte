<script lang="ts">
    import { onMount } from 'svelte';
    import TopWinners from '$lib/components/TopWinners.svelte';

    export let data;

    const DISCORD_URL = 'https://discord.gg/StPwKKPPTj';

    const staggerClasses = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4'];

    $: ({ summary, allParticipants, topFive } = data);

    // Adapter: TopWinners needs LeaderboardEntry shape but only reads id/nickname/points/profit/rankChange
    $: topWinnersData = (allParticipants?.length ? allParticipants : topFive || []).map((p: any) => ({
        ...p,
        stats: { winRate: p.winRate ?? 0, profitFactor: 0, rrRatio: 0, maxDrawdown: 0, totalTrades: 0, avgWin: 0, avgLoss: 0 },
        equityCurve: [],
        history: []
    }));

    const stats = [
        { label: 'Active Traders', key: 'totalParticipants', format: 'number' },
        { label: 'Total Trades', key: 'totalTrades', format: 'number' },
        { label: 'Volume (Lots)', key: 'totalVolume', format: 'number' },
        { label: 'Avg Win Rate', key: 'averageWinRate', format: 'percent' }
    ] as const;

    const features = [
        {
            title: 'Real-time Leaderboard',
            desc: 'Live rankings update the moment trades close. Watch your position change as the market moves.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />`
        },
        {
            title: 'AI-Powered Analysis',
            desc: 'Daily AI commentary on top performers, notable trades, and market patterns across all participants.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />`
        },
        {
            title: 'Live Trade Feed',
            desc: 'Stream of every trade as it opens and closes. Filter by trader, symbol, or outcome in real time.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />`
        }
    ];

    const steps = [
        { title: 'Join Discord', desc: 'เข้าร่วม community และลงทะเบียนเข้าแข่งขันผ่าน Discord server ของเรา', icon: '💬', cta: true },
        { title: 'Connect MT5', desc: 'เชื่อมต่อ MetaTrader 5 account ของคุณ ระบบจะ sync trade อัตโนมัติ', icon: '🔗', cta: false },
        { title: 'Compete & Win', desc: 'เทรด, สะสม points จาก pip ที่ได้ และปีนขึ้น leaderboard แบบ real-time', icon: '🏆', cta: false }
    ];

    function formatNumber(n: number): string {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toLocaleString();
    }
</script>

<svelte:head>
    <title>EliteGold — Forex Trading Competition Community</title>
    <meta name="description" content="เข้าร่วม EliteGold trading competition แข่งขันเทรดทองคำกับ traders จริงแบบ real-time บน MT5 ดู leaderboard live พร้อม AI analysis" />
</svelte:head>

<!-- ─── HERO ─────────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden min-h-[92vh] flex items-center justify-center">
    <!-- Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-[#111111]"></div>
    <!-- Gold radial glow -->
    <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,158,11,0.13) 0%, transparent 65%);"></div>
    <!-- Grid pattern -->
    <div class="absolute inset-0 pointer-events-none opacity-[0.03]" style="background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px); background-size: 40px 40px;"></div>

    <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <!-- Eyebrow badge -->
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-8 animate-fade-in stagger-1">
            <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
            Live Competition · Season 1
        </div>

        <!-- Headline -->
        <h1 class="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up stagger-2 leading-[1.1]">
            <span class="text-white block">Trade Hard.</span>
            <span class="hero-gold-text block">Compete Harder.</span>
        </h1>

        <p class="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up stagger-3">
            EliteGold เป็น community ของนักเทรดทองคำที่จัดการแข่งขันบน MT5 แบบ real-time
            เชื่อมต่อ account ขึ้น leaderboard และพิสูจน์ฝีมือของคุณ
        </p>

        <!-- CTAs -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-4">
            <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-lg transition-all btn-press shadow-lg shadow-[#5865F2]/30"
            >
                <svg class="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill-rule="evenodd" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.48 13.48 0 0 0-1.726 3.553 18.046 18.046 0 0 0-8.82 0 13.483 13.483 0 0 0-1.727-3.553.074.074 0 0 0-.079-.037 19.791 19.791 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" clip-rule="evenodd" />
                </svg>
                Join Discord
            </a>
            <a
                href="/dashboard"
                class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-semibold text-lg transition-all btn-press"
            >
                ดู Competition
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </a>
        </div>
    </div>

    <!-- Bottom fade -->
    <div class="absolute bottom-0 inset-x-0 h-24 pointer-events-none" style="background: linear-gradient(to bottom, transparent, #000);"></div>
</section>

<!-- ─── LIVE STATS BAR ────────────────────────────────────────────────── -->
<section class="py-12 border-y border-dark-border bg-dark-surface/60">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
            {#each stats as stat, i}
                <div class="text-center animate-fade-in-up {staggerClasses[i]}">
                    <div class="text-3xl sm:text-4xl font-black text-white mb-1 tabular-nums">
                        {stat.format === 'percent'
                            ? (summary?.[stat.key] ?? 0) + '%'
                            : formatNumber(summary?.[stat.key] ?? 0)}
                    </div>
                    <div class="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</div>
                </div>
            {/each}
        </div>
    </div>
</section>

<!-- ─── FEATURE HIGHLIGHTS ────────────────────────────────────────────── -->
<section class="py-20 sm:py-28">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14 animate-fade-in-up">
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">
                Built for <span class="text-gold">Serious Traders</span>
            </h2>
            <p class="text-gray-400 max-w-xl mx-auto">
                ทุกอย่างที่คุณต้องการในการแข่งขัน วิเคราะห์ และพัฒนาตัวเอง — ในที่เดียว
            </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {#each features as feature, i}
                <div class="p-6 rounded-xl bg-dark-surface border border-dark-border card-hover animate-fade-in-up {staggerClasses[i]}">
                    <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                        <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {@html feature.icon}
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
            {/each}
        </div>
    </div>
</section>

<!-- ─── TOP TRADERS PREVIEW ───────────────────────────────────────────── -->
<section class="py-4 pb-20 sm:pb-28">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-10 animate-fade-in-up">
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-3">
                Current <span class="text-gold">Champions</span>
            </h2>
            <p class="text-gray-400 text-sm">Top performers from the live competition</p>
        </div>

        {#if topWinnersData.length >= 1}
            <TopWinners data={topWinnersData} />
            <div class="text-center mt-8">
                <a href="/leaderboard" class="text-sm text-amber-400 hover:text-amber-300 hover:underline transition-colors">
                    Full Leaderboard →
                </a>
            </div>
        {:else}
            <div class="text-center py-16 text-gray-500 bg-dark-surface rounded-xl border border-dark-border">
                <div class="text-5xl mb-4">🏆</div>
                <p class="font-medium">Competition rankings will appear once trading begins.</p>
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" class="text-sm text-amber-400 hover:underline mt-2 inline-block">
                    Join Discord to participate →
                </a>
            </div>
        {/if}
    </div>
</section>

<!-- ─── HOW IT WORKS ──────────────────────────────────────────────────── -->
<section class="py-20 sm:py-28 border-t border-dark-border bg-dark-surface/30">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14 animate-fade-in-up">
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">
                เริ่มต้น <span class="text-gold">ยังไง?</span>
            </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {#each steps as step, i}
                <div class="flex flex-col items-center text-center animate-fade-in-up {staggerClasses[i]}">
                    <!-- Step circle -->
                    <div class="relative w-20 h-20 rounded-full border-2 border-amber-500/30 bg-amber-500/8 flex items-center justify-center text-3xl mb-5">
                        {step.icon}
                        <span class="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center shadow-lg">
                            {i + 1}
                        </span>
                    </div>
                    <!-- Connector line (desktop) -->
                    {#if i < steps.length - 1}
                        <div class="hidden md:block absolute top-10 left-[calc(50%+4rem)] right-[calc(-50%+4rem)] h-px bg-gradient-to-r from-amber-500/30 to-transparent"></div>
                    {/if}
                    <h3 class="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                    {#if step.cta}
                        <a
                            href={DISCORD_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="mt-4 text-xs text-amber-400 hover:underline"
                        >
                            Join now →
                        </a>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</section>

<!-- ─── FINAL CTA ─────────────────────────────────────────────────────── -->
<section class="py-24 sm:py-32 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-amber-900/15 via-black to-black"></div>
    <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 55% 65% at 50% 50%, rgba(245,158,11,0.09) 0%, transparent 70%);"></div>

    <div class="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <div class="text-6xl mb-6">👑</div>
        <h2 class="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            พร้อมพิสูจน์ฝีมือแล้วหรือยัง?
        </h2>
        <p class="text-gray-400 text-lg mb-10 leading-relaxed">
            เข้าร่วม EliteGold Discord ลงทะเบียนการแข่งขัน และเริ่มเทรดได้เลย
        </p>
        <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xl transition-all btn-press shadow-2xl shadow-[#5865F2]/25"
        >
            <svg class="w-7 h-7 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.48 13.48 0 0 0-1.726 3.553 18.046 18.046 0 0 0-8.82 0 13.483 13.483 0 0 0-1.727-3.553.074.074 0 0 0-.079-.037 19.791 19.791 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" clip-rule="evenodd" />
            </svg>
            Join Discord Now
        </a>
    </div>
</section>

<style>
    .hero-gold-text {
        background: linear-gradient(135deg, #ffd700 0%, #ffed4a 30%, #ffffff 50%, #ffd700 70%, #b8860b 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: hero-gold-shimmer 4s linear infinite;
    }

    @keyframes hero-gold-shimmer {
        0% { background-position: 0% center; }
        100% { background-position: 200% center; }
    }
</style>
