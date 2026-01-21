<script lang="ts">
    import type { LeaderboardEntry } from "$lib/mock/leaderboard";
    import { onMount } from "svelte";

    export let data: LeaderboardEntry[] = [];

    // Get top 3
    $: sortedData = [...data]
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.profit - a.profit;
        })
        .slice(0, 3);

    $: first = sortedData[0];
    $: second = sortedData[1];
    $: third = sortedData[2];

    let mounted = false;
    onMount(() => {
        setTimeout(() => (mounted = true), 100);
    });

    function formatProfit(profit: number): string {
        const sign = profit > 0 ? "+" : "";
        return `${sign}${profit.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    function goToProfile(id: string) {
        window.location.href = `/leaderboard/${id}`;
    }
</script>

<div class="top-winners-container">
    <!-- Animated Background -->
    <div class="bg-effects">
        <div class="glow-orb gold"></div>
        <div class="glow-orb silver"></div>
        <div class="glow-orb bronze"></div>
        {#each Array(30) as _, i}
            <div
                class="particle"
                style="--delay: {i * 0.2}s; --x: {Math.random() *
                    100}%; --duration: {3 + Math.random() * 4}s; --size: {2 +
                    Math.random() * 4}px;"
            ></div>
        {/each}
    </div>

    <!-- Title -->
    <div class="title-section" class:visible={mounted}>
        <div class="crown-icon">👑</div>
        <h2 class="title">Top Champions</h2>
        <p class="subtitle">Elite traders leading the competition</p>
    </div>

    <!-- Podium Section -->
    <div class="podium-container" class:visible={mounted}>
        <!-- 2nd Place (Left) -->
        {#if second}
            <div
                class="winner-card silver"
                class:visible={mounted}
                style="--delay: 0.3s"
                role="button"
                tabindex="0"
                on:click={() => goToProfile(second.id)}
                on:keydown={(e) => e.key === "Enter" && goToProfile(second.id)}
            >
                <div class="card-glow"></div>
                <div class="rank-badge">
                    <span class="rank-number">2</span>
                    <span class="medal">🥈</span>
                </div>
                <div class="avatar-container">
                    <div class="avatar-ring"></div>
                    <div class="avatar">
                        <span class="avatar-initial"
                            >{second.nickname.charAt(0).toUpperCase()}</span
                        >
                    </div>
                </div>
                <div class="winner-info">
                    <h3 class="nickname">{second.nickname}</h3>
                    <div class="stats">
                        <div class="stat">
                            <span class="stat-label">Points</span>
                            <span class="stat-value"
                                >{second.points.toLocaleString()}</span
                            >
                        </div>
                        <div class="stat">
                            <span class="stat-label">Profit</span>
                            <span
                                class="stat-value profit {second.profit >= 0
                                    ? 'positive'
                                    : 'negative'}"
                            >
                                {formatProfit(second.profit)}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="podium-stand silver-stand">
                    <span class="stand-number">2</span>
                </div>
            </div>
        {/if}

        <!-- 1st Place (Center - Highest) -->
        {#if first}
            <div
                class="winner-card gold champion"
                class:visible={mounted}
                style="--delay: 0.1s"
                role="button"
                tabindex="0"
                on:click={() => goToProfile(first.id)}
                on:keydown={(e) => e.key === "Enter" && goToProfile(first.id)}
            >
                <div class="card-glow"></div>
                <div class="champion-crown">👑</div>
                <div class="rank-badge">
                    <span class="rank-number">1</span>
                    <span class="medal">🥇</span>
                </div>
                <div class="avatar-container">
                    <div class="avatar-ring"></div>
                    <div class="avatar">
                        <span class="avatar-initial"
                            >{first.nickname.charAt(0).toUpperCase()}</span
                        >
                    </div>
                    <div class="sparkles">
                        {#each Array(8) as _, i}
                            <div class="sparkle" style="--i: {i}"></div>
                        {/each}
                    </div>
                </div>
                <div class="winner-info">
                    <h3 class="nickname">{first.nickname}</h3>
                    <div class="champion-title">🏆 Champion 🏆</div>
                    <div class="stats">
                        <div class="stat">
                            <span class="stat-label">Points</span>
                            <span class="stat-value"
                                >{first.points.toLocaleString()}</span
                            >
                        </div>
                        <div class="stat">
                            <span class="stat-label">Profit</span>
                            <span
                                class="stat-value profit {first.profit >= 0
                                    ? 'positive'
                                    : 'negative'}"
                            >
                                {formatProfit(first.profit)}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="podium-stand gold-stand">
                    <span class="stand-number">1</span>
                </div>
            </div>
        {/if}

        <!-- 3rd Place (Right) -->
        {#if third}
            <div
                class="winner-card bronze"
                class:visible={mounted}
                style="--delay: 0.5s"
                role="button"
                tabindex="0"
                on:click={() => goToProfile(third.id)}
                on:keydown={(e) => e.key === "Enter" && goToProfile(third.id)}
            >
                <div class="card-glow"></div>
                <div class="rank-badge">
                    <span class="rank-number">3</span>
                    <span class="medal">🥉</span>
                </div>
                <div class="avatar-container">
                    <div class="avatar-ring"></div>
                    <div class="avatar">
                        <span class="avatar-initial"
                            >{third.nickname.charAt(0).toUpperCase()}</span
                        >
                    </div>
                </div>
                <div class="winner-info">
                    <h3 class="nickname">{third.nickname}</h3>
                    <div class="stats">
                        <div class="stat">
                            <span class="stat-label">Points</span>
                            <span class="stat-value"
                                >{third.points.toLocaleString()}</span
                            >
                        </div>
                        <div class="stat">
                            <span class="stat-label">Profit</span>
                            <span
                                class="stat-value profit {third.profit >= 0
                                    ? 'positive'
                                    : 'negative'}"
                            >
                                {formatProfit(third.profit)}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="podium-stand bronze-stand">
                    <span class="stand-number">3</span>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .top-winners-container {
        position: relative;
        padding: 3rem 1rem;
        background: linear-gradient(
            180deg,
            #f8fafc 0%,
            #e2e8f0 50%,
            #cbd5e1 100%
        );
        border-radius: 1.5rem;
        overflow: hidden;
        margin-bottom: 2rem;
    }

    :global(.dark) .top-winners-container {
        background: #000000;
    }

    /* Background Effects */
    .bg-effects {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
    }

    .glow-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0.4;
        animation: float 8s ease-in-out infinite;
    }

    .glow-orb.gold {
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, #ffd700 0%, transparent 70%);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .glow-orb.silver {
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, #c0c0c0 0%, transparent 70%);
        top: 30%;
        left: 20%;
        animation-delay: -2s;
    }

    .glow-orb.bronze {
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, #cd7f32 0%, transparent 70%);
        top: 30%;
        right: 20%;
        animation-delay: -4s;
    }

    @keyframes float {
        0%,
        100% {
            transform: translate(-50%, -50%) scale(1);
        }
        50% {
            transform: translate(-50%, -50%) scale(1.2);
        }
    }

    .particle {
        position: absolute;
        width: var(--size);
        height: var(--size);
        background: linear-gradient(135deg, #ffd700, #ffed4a);
        border-radius: 50%;
        left: var(--x);
        bottom: -20px;
        opacity: 0;
        animation: particle-rise var(--duration) ease-out infinite;
        animation-delay: var(--delay);
    }

    @keyframes particle-rise {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
        }
        10% {
            opacity: 0.8;
        }
        90% {
            opacity: 0.2;
        }
        100% {
            transform: translateY(-500px) rotate(360deg);
            opacity: 0;
        }
    }

    /* Title Section */
    .title-section {
        text-align: center;
        margin-bottom: 3rem;
        position: relative;
        z-index: 10;
        opacity: 0;
        transform: translateY(-30px);
        transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .title-section.visible {
        opacity: 1;
        transform: translateY(0);
    }

    .crown-icon {
        font-size: 4rem;
        animation: crown-bounce 2s ease-in-out infinite;
        filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
    }

    @keyframes crown-bounce {
        0%,
        100% {
            transform: translateY(0) rotate(-5deg);
        }
        50% {
            transform: translateY(-10px) rotate(5deg);
        }
    }

    .title {
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(
            135deg,
            #ffd700 0%,
            #ffed4a 25%,
            #fff 50%,
            #ffd700 75%,
            #b8860b 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: gold-shimmer 3s linear infinite;
        margin: 0.5rem 0;
        text-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    }

    @keyframes gold-shimmer {
        0% {
            background-position: 0% center;
        }
        100% {
            background-position: 200% center;
        }
    }

    .subtitle {
        color: rgba(0, 0, 0, 0.6);
        font-size: 1rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    :global(.dark) .subtitle {
        color: rgba(255, 255, 255, 0.6);
    }

    /* Podium Container */
    .podium-container {
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: 1rem;
        position: relative;
        z-index: 10;
        padding-bottom: 2rem;
    }

    /* Winner Cards */
    .winner-card {
        position: relative;
        width: 180px;
        padding: 1.5rem 1rem;
        border-radius: 1.5rem;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 0, 0, 0.1);
        text-align: center;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        opacity: 0;
        transform: translateY(50px) scale(0.9);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }

    :global(.dark) .winner-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: none;
    }

    .winner-card.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        transition-delay: var(--delay);
    }

    .winner-card:hover {
        transform: translateY(-10px) scale(1.05);
        background: rgba(255, 255, 255, 0.95);
        border-color: rgba(0, 0, 0, 0.15);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    }

    :global(.dark) .winner-card:hover {
        background: rgba(30, 30, 40, 0.95);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    /* Keep text visible on hover */
    .winner-card:hover .nickname {
        color: #1f2937;
    }

    :global(.dark) .winner-card:hover .nickname {
        color: #ffffff;
    }

    .winner-card:hover .stat-label {
        color: rgba(0, 0, 0, 0.6);
    }

    :global(.dark) .winner-card:hover .stat-label {
        color: rgba(255, 255, 255, 0.6);
    }

    .winner-card:hover .stat-value {
        color: #1f2937;
    }

    :global(.dark) .winner-card:hover .stat-value {
        color: #ffffff;
    }

    .winner-card:hover .stat {
        background: rgba(0, 0, 0, 0.08);
    }

    :global(.dark) .winner-card:hover .stat {
        background: rgba(255, 255, 255, 0.1);
    }

    .winner-card:active {
        transform: translateY(-5px) scale(1.02);
    }

    /* Card Glow */
    .card-glow {
        position: absolute;
        inset: -2px;
        border-radius: 1.5rem;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: -1;
    }

    .winner-card:hover .card-glow {
        opacity: 1;
    }

    .winner-card.gold .card-glow {
        background: linear-gradient(135deg, #ffd700, #ffed4a, #ffd700);
        filter: blur(15px);
    }

    .winner-card.silver .card-glow {
        background: linear-gradient(135deg, #c0c0c0, #e8e8e8, #c0c0c0);
        filter: blur(15px);
    }

    .winner-card.bronze .card-glow {
        background: linear-gradient(135deg, #cd7f32, #daa06d, #cd7f32);
        filter: blur(15px);
    }

    /* Champion Special */
    .winner-card.champion {
        width: 220px;
        padding: 2rem 1.5rem;
        background: linear-gradient(
            180deg,
            rgba(255, 215, 0, 0.15) 0%,
            rgba(255, 255, 255, 0.95) 100%
        );
        border: 2px solid rgba(255, 215, 0, 0.5);
        box-shadow:
            0 0 40px rgba(255, 215, 0, 0.3),
            0 20px 60px rgba(0, 0, 0, 0.15);
    }

    :global(.dark) .winner-card.champion {
        background: linear-gradient(
            180deg,
            rgba(255, 215, 0, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 100%
        );
        border: 2px solid rgba(255, 215, 0, 0.3);
        box-shadow:
            0 0 60px rgba(255, 215, 0, 0.2),
            0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .winner-card.champion:hover {
        background: linear-gradient(
            180deg,
            rgba(255, 215, 0, 0.25) 0%,
            rgba(255, 255, 255, 0.98) 100%
        );
        box-shadow:
            0 0 60px rgba(255, 215, 0, 0.4),
            0 25px 70px rgba(0, 0, 0, 0.2);
    }

    :global(.dark) .winner-card.champion:hover {
        background: linear-gradient(
            180deg,
            rgba(255, 215, 0, 0.2) 0%,
            rgba(30, 30, 40, 0.95) 100%
        );
        box-shadow:
            0 0 80px rgba(255, 215, 0, 0.3),
            0 25px 70px rgba(0, 0, 0, 0.5);
    }

    .champion-crown {
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 3rem;
        animation: champion-crown 2s ease-in-out infinite;
        filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
    }

    @keyframes champion-crown {
        0%,
        100% {
            transform: translateX(-50%) translateY(0) rotate(-3deg);
        }
        50% {
            transform: translateX(-50%) translateY(-8px) rotate(3deg);
        }
    }

    .champion-title {
        font-size: 0.75rem;
        color: #ffd700;
        letter-spacing: 0.1em;
        margin: 0.5rem 0;
        animation: pulse-text 2s ease-in-out infinite;
    }

    @keyframes pulse-text {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
    }

    /* Rank Badge */
    .rank-badge {
        position: absolute;
        top: -15px;
        right: -10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }

    .medal {
        font-size: 2rem;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .rank-number {
        display: none;
    }

    /* Avatar */
    .avatar-container {
        position: relative;
        width: 80px;
        height: 80px;
        margin: 0 auto 1rem;
    }

    .winner-card.champion .avatar-container {
        width: 100px;
        height: 100px;
    }

    .avatar-ring {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        animation: ring-rotate 4s linear infinite;
    }

    .winner-card.gold .avatar-ring {
        background: conic-gradient(from 0deg, #ffd700, #ffed4a, #fff, #ffd700);
    }

    .winner-card.silver .avatar-ring {
        background: conic-gradient(from 0deg, #c0c0c0, #e8e8e8, #fff, #c0c0c0);
    }

    .winner-card.bronze .avatar-ring {
        background: conic-gradient(
            from 0deg,
            #cd7f32,
            #daa06d,
            #f4c97d,
            #cd7f32
        );
    }

    @keyframes ring-rotate {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .avatar {
        position: absolute;
        inset: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 2rem;
        color: #fff;
    }

    .winner-card.gold .avatar {
        background: linear-gradient(135deg, #b8860b, #daa520, #ffd700);
        font-size: 2.5rem;
    }

    .winner-card.silver .avatar {
        background: linear-gradient(135deg, #6b7280, #9ca3af, #d1d5db);
    }

    .winner-card.bronze .avatar {
        background: linear-gradient(135deg, #92400e, #b45309, #cd7f32);
    }

    /* Sparkles for Champion */
    .sparkles {
        position: absolute;
        inset: -20px;
        pointer-events: none;
    }

    .sparkle {
        position: absolute;
        width: 6px;
        height: 6px;
        background: #ffd700;
        border-radius: 50%;
        animation: sparkle 2s ease-in-out infinite;
        animation-delay: calc(var(--i) * 0.25s);
    }

    .sparkle:nth-child(1) {
        top: 10%;
        left: 20%;
    }
    .sparkle:nth-child(2) {
        top: 5%;
        left: 50%;
    }
    .sparkle:nth-child(3) {
        top: 10%;
        right: 20%;
    }
    .sparkle:nth-child(4) {
        top: 40%;
        left: 5%;
    }
    .sparkle:nth-child(5) {
        top: 40%;
        right: 5%;
    }
    .sparkle:nth-child(6) {
        bottom: 10%;
        left: 20%;
    }
    .sparkle:nth-child(7) {
        bottom: 5%;
        left: 50%;
    }
    .sparkle:nth-child(8) {
        bottom: 10%;
        right: 20%;
    }

    @keyframes sparkle {
        0%,
        100% {
            opacity: 0;
            transform: scale(0);
        }
        50% {
            opacity: 1;
            transform: scale(1);
        }
    }

    /* Winner Info */
    .winner-info {
        position: relative;
        z-index: 10;
    }

    .nickname {
        font-size: 1.1rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 0.5rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    :global(.dark) .nickname {
        color: #fff;
    }

    .winner-card.champion .nickname {
        font-size: 1.3rem;
        background: linear-gradient(135deg, #ffd700, #fff, #ffd700);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }

    .stats {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.4rem 0.6rem;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 0.5rem;
    }

    :global(.dark) .stat {
        background: rgba(255, 255, 255, 0.05);
    }

    .stat-label {
        font-size: 0.7rem;
        color: rgba(0, 0, 0, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    :global(.dark) .stat-label {
        color: rgba(255, 255, 255, 0.5);
    }

    .stat-value {
        font-size: 0.85rem;
        font-weight: 700;
        color: #1f2937;
    }

    :global(.dark) .stat-value {
        color: #fff;
    }

    .stat-value.profit.positive {
        color: #22c55e;
    }

    .stat-value.profit.negative {
        color: #ef4444;
    }

    /* Podium Stands */
    .podium-stand {
        position: absolute;
        bottom: -30px;
        left: 50%;
        transform: translateX(-50%);
        width: 120%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem 0.5rem 0 0;
        font-weight: 900;
        font-size: 1.5rem;
        color: rgba(0, 0, 0, 0.3);
    }

    .gold-stand {
        height: 60px;
        background: linear-gradient(180deg, #ffd700 0%, #b8860b 100%);
        box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
    }

    .silver-stand {
        height: 40px;
        background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%);
        box-shadow: 0 10px 30px rgba(192, 192, 192, 0.3);
    }

    .bronze-stand {
        height: 30px;
        background: linear-gradient(180deg, #cd7f32 0%, #8b4513 100%);
        box-shadow: 0 10px 30px rgba(205, 127, 50, 0.3);
    }

    .stand-number {
        opacity: 0.4;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .top-winners-container {
            padding: 2rem 0.5rem;
        }

        .title {
            font-size: 1.8rem;
        }

        .crown-icon {
            font-size: 3rem;
        }

        .podium-container {
            gap: 0.5rem;
        }

        .winner-card {
            width: 110px;
            padding: 1rem 0.5rem;
        }

        .winner-card.champion {
            width: 140px;
            padding: 1.5rem 0.75rem;
        }

        .avatar-container {
            width: 50px;
            height: 50px;
        }

        .winner-card.champion .avatar-container {
            width: 70px;
            height: 70px;
        }

        .avatar {
            font-size: 1.2rem;
        }

        .winner-card.gold .avatar {
            font-size: 1.8rem;
        }

        .nickname {
            font-size: 0.85rem;
        }

        .winner-card.champion .nickname {
            font-size: 1rem;
        }

        .stat {
            padding: 0.3rem 0.4rem;
        }

        .stat-label {
            font-size: 0.6rem;
        }

        .stat-value {
            font-size: 0.75rem;
        }

        .champion-title {
            font-size: 0.65rem;
        }

        .medal {
            font-size: 1.5rem;
        }

        .champion-crown {
            font-size: 2rem;
            top: -20px;
        }

        .gold-stand {
            height: 50px;
        }
        .silver-stand {
            height: 35px;
        }
        .bronze-stand {
            height: 25px;
        }
    }

    @media (max-width: 480px) {
        .winner-card {
            width: 95px;
        }

        .winner-card.champion {
            width: 120px;
        }

        .stats {
            gap: 0.3rem;
        }

        .subtitle {
            font-size: 0.75rem;
        }
    }
</style>
