<script>
    import "../app.css";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fade, scale } from "svelte/transition";

    let showContent = false;
    let showTagline = false;
    let showLoader = false;
    let fadeOut = false;

    onMount(() => {
        // Staggered animation sequence
        setTimeout(() => (showContent = true), 100);
        setTimeout(() => (showTagline = true), 600);
        setTimeout(() => (showLoader = true), 1000);

        // Start fade out and navigate
        setTimeout(() => {
            fadeOut = true;
            setTimeout(() => goto("/leaderboard"), 500);
        }, 2200);
    });
</script>

<svelte:head>
    <title>EliteGold | Trading Competition</title>
</svelte:head>

<div class="splash-container" class:fade-out={fadeOut}>
    <!-- Animated background particles -->
    <div class="particles">
        {#each Array(20) as _, i}
            <div
                class="particle"
                style="--delay: {i * 0.15}s; --x: {Math.random() *
                    100}%; --duration: {2 + Math.random() * 3}s"
            ></div>
        {/each}
    </div>

    <!-- Glowing orb background -->
    <div class="glow-orb"></div>
    <div class="glow-orb secondary"></div>

    <!-- Main content -->
    <div class="content">
        {#if showContent}
            <div
                class="logo-container"
                in:scale={{ duration: 500, start: 0.5 }}
            >
                <!-- Crown icon -->
                <div class="crown">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M2 17L4 7L8 10L12 4L16 10L20 7L22 17H2Z"
                            fill="url(#goldGradient)"
                            stroke="url(#goldGradient)"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        <path
                            d="M2 17H22V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V17Z"
                            fill="url(#goldGradient)"
                        />
                        <defs>
                            <linearGradient
                                id="goldGradient"
                                x1="2"
                                y1="4"
                                x2="22"
                                y2="21"
                                gradientUnits="userSpaceOnUse"
                            >
                                <stop stop-color="#F6E05E" />
                                <stop offset="0.5" stop-color="#D69E2E" />
                                <stop offset="1" stop-color="#B7791F" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                <!-- Logo text -->
                <h1 class="logo-text">
                    <span class="elite">Elite</span><span class="gold"
                        >Gold</span
                    >
                </h1>
            </div>
        {/if}

        {#if showTagline}
            <p class="tagline" in:fade={{ duration: 400 }}>
                Trading Competition
            </p>
        {/if}

        {#if showLoader}
            <div class="loader-container" in:fade={{ duration: 300 }}>
                <div class="loader">
                    <div class="loader-bar"></div>
                </div>
                <p class="loading-text">Loading your dashboard...</p>
            </div>
        {/if}
    </div>
</div>

<style>
    .splash-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000000;
        position: relative;
        overflow: hidden;
        transition: opacity 0.5s ease-out;
    }

    .splash-container.fade-out {
        opacity: 0;
    }

    /* Particle effects */
    .particles {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
    }

    .particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: linear-gradient(135deg, #f6e05e, #d69e2e);
        border-radius: 50%;
        left: var(--x);
        bottom: -10px;
        opacity: 0;
        animation: float-up var(--duration) ease-out infinite;
        animation-delay: var(--delay);
    }

    @keyframes float-up {
        0% {
            transform: translateY(0) scale(1);
            opacity: 0;
        }
        10% {
            opacity: 0.8;
        }
        90% {
            opacity: 0.3;
        }
        100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
        }
    }

    /* Glowing orbs */
    .glow-orb {
        position: absolute;
        width: 400px;
        height: 400px;
        border-radius: 50%;
        background: radial-gradient(
            circle,
            rgba(214, 158, 46, 0.15) 0%,
            transparent 70%
        );
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 3s ease-in-out infinite;
    }

    .glow-orb.secondary {
        width: 600px;
        height: 600px;
        background: radial-gradient(
            circle,
            rgba(246, 224, 94, 0.08) 0%,
            transparent 70%
        );
        animation-delay: -1.5s;
    }

    @keyframes pulse {
        0%,
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.7;
        }
    }

    /* Content */
    .content {
        position: relative;
        z-index: 10;
        text-align: center;
        padding: 2rem;
    }

    .logo-container {
        margin-bottom: 1rem;
    }

    .crown {
        width: 60px;
        height: 60px;
        margin: 0 auto 1rem;
        animation: crown-glow 2s ease-in-out infinite;
    }

    @keyframes crown-glow {
        0%,
        100% {
            filter: drop-shadow(0 0 10px rgba(214, 158, 46, 0.5));
        }
        50% {
            filter: drop-shadow(0 0 25px rgba(246, 224, 94, 0.8));
        }
    }

    .logo-text {
        font-size: 3.5rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin: 0;
        line-height: 1;
    }

    .elite {
        color: #ffffff;
        text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
    }

    .gold {
        background: linear-gradient(
            135deg,
            #f6e05e 0%,
            #d69e2e 50%,
            #b7791f 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: none;
        filter: drop-shadow(0 0 20px rgba(214, 158, 46, 0.4));
    }

    .tagline {
        font-size: 1.1rem;
        color: rgba(255, 255, 255, 0.6);
        margin: 0.5rem 0 2rem;
        font-weight: 500;
        letter-spacing: 0.15em;
        text-transform: uppercase;
    }

    /* Loader */
    .loader-container {
        margin-top: 2rem;
    }

    .loader {
        width: 200px;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        margin: 0 auto;
        overflow: hidden;
    }

    .loader-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #f6e05e, #d69e2e, #f6e05e);
        background-size: 200% 100%;
        border-radius: 4px;
        animation:
            load 1.2s ease-out forwards,
            shimmer 1s linear infinite;
    }

    @keyframes load {
        0% {
            width: 0%;
        }
        100% {
            width: 100%;
        }
    }

    @keyframes shimmer {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }

    .loading-text {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 1rem;
        font-weight: 400;
    }

    /* Responsive */
    @media (max-width: 640px) {
        .logo-text {
            font-size: 2.5rem;
        }

        .crown {
            width: 48px;
            height: 48px;
        }

        .tagline {
            font-size: 0.9rem;
            letter-spacing: 0.1em;
        }

        .loader {
            width: 160px;
        }
    }
</style>
