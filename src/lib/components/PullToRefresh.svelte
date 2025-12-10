<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from "svelte";

    export let threshold = 80; // Pull distance to trigger refresh
    export let isRefreshing = false;
    export let cooldownMs = 5000; // 5 seconds cooldown

    const dispatch = createEventDispatcher<{ refresh: void }>();

    let pullDistance = 0;
    let isPulling = false;
    let startY = 0;
    let containerEl: HTMLDivElement;

    // Cooldown state
    let lastRefreshTime = 0;
    let cooldownRemaining = 0;
    let cooldownInterval: ReturnType<typeof setInterval> | null = null;

    $: isOnCooldown = cooldownRemaining > 0;

    function startCooldownTimer() {
        lastRefreshTime = Date.now();
        cooldownRemaining = Math.ceil(cooldownMs / 1000);

        if (cooldownInterval) clearInterval(cooldownInterval);

        cooldownInterval = setInterval(() => {
            const elapsed = Date.now() - lastRefreshTime;
            const remaining = Math.ceil((cooldownMs - elapsed) / 1000);

            if (remaining <= 0) {
                cooldownRemaining = 0;
                if (cooldownInterval) {
                    clearInterval(cooldownInterval);
                    cooldownInterval = null;
                }
            } else {
                cooldownRemaining = remaining;
            }
        }, 100);
    }

    // Check if at top of page (works better across browsers/PWA)
    function isAtTop(): boolean {
        return (
            window.scrollY <= 0 &&
            document.documentElement.scrollTop <= 0 &&
            (document.body.scrollTop || 0) <= 0
        );
    }

    function handleTouchStart(e: TouchEvent) {
        // Only activate if at top of page
        if (isAtTop()) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isPulling || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0 && isAtTop()) {
            // Apply resistance to make it feel natural
            pullDistance = Math.min(diff * 0.5, threshold * 1.5);

            // Prevent default scrolling/bounce when pulling
            if (pullDistance > 5) {
                e.preventDefault();
                e.stopPropagation();
            }
        } else if (diff < 0) {
            // User is scrolling up normally, cancel pull
            isPulling = false;
            pullDistance = 0;
        }
    }

    function handleTouchEnd() {
        if (!isPulling) return;

        if (pullDistance >= threshold && !isRefreshing) {
            // Check cooldown before dispatching
            if (!isOnCooldown) {
                dispatch("refresh");
                startCooldownTimer();
            }
        }

        isPulling = false;
        pullDistance = 0;
    }

    // Use onMount to add event listeners with passive: false (required for preventDefault on iOS/PWA)
    onMount(() => {
        if (!containerEl) return;

        containerEl.addEventListener("touchstart", handleTouchStart, {
            passive: true,
        });
        containerEl.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        });
        containerEl.addEventListener("touchend", handleTouchEnd, {
            passive: true,
        });
        containerEl.addEventListener("touchcancel", handleTouchEnd, {
            passive: true,
        });

        return () => {
            containerEl.removeEventListener("touchstart", handleTouchStart);
            containerEl.removeEventListener("touchmove", handleTouchMove);
            containerEl.removeEventListener("touchend", handleTouchEnd);
            containerEl.removeEventListener("touchcancel", handleTouchEnd);
        };
    });

    onDestroy(() => {
        if (cooldownInterval) clearInterval(cooldownInterval);
    });

    $: progress = Math.min(pullDistance / threshold, 1);
    $: rotation = progress * 360;
</script>

<div bind:this={containerEl} class="pull-to-refresh-container">
    <!-- Pull indicator -->
    <div
        class="pull-indicator"
        style="
            transform: translateY({pullDistance - 60}px);
            opacity: {progress};
        "
    >
        <div
            class="spinner"
            class:is-refreshing={isRefreshing}
            style="transform: rotate({rotation}deg);"
        >
            {#if isRefreshing}
                <svg
                    class="animate-spin"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        class="opacity-25"
                    />
                    <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        class="opacity-75"
                    />
                </svg>
            {:else}
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M12 5v14M5 12l7-7 7 7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            {/if}
        </div>
        <span
            class="pull-text"
            class:cooldown-warning={isOnCooldown && progress >= 1}
        >
            {#if isRefreshing}
                Refreshing...
            {:else if isOnCooldown && progress >= 1}
                รอสักครู่... ({cooldownRemaining}s)
            {:else if progress >= 1}
                Release to refresh
            {:else}
                Pull to refresh
            {/if}
        </span>
    </div>

    <!-- Main content -->
    <div class="content" style="transform: translateY({pullDistance}px);">
        <slot />
    </div>
</div>

<style>
    .pull-to-refresh-container {
        position: relative;
        min-height: 100%;
        touch-action: pan-y;
        /* Prevent browser's default pull-to-refresh on PWA/mobile */
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
    }

    .pull-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 60px;
        z-index: 100;
        pointer-events: none;
    }

    .spinner {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: white;
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
        transition: transform 0.1s ease-out;
    }

    .spinner.is-refreshing {
        animation: pulse 1s ease-in-out infinite;
    }

    .pull-text {
        margin-top: 8px;
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
    }

    :global(.dark) .pull-text {
        color: #9ca3af;
    }

    .pull-text.cooldown-warning {
        color: #f59e0b;
        font-weight: 600;
    }

    :global(.dark) .pull-text.cooldown-warning {
        color: #fbbf24;
    }

    .content {
        transition: transform 0.2s ease-out;
        will-change: transform;
    }

    @keyframes pulse {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.1);
        }
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .animate-spin {
        animation: spin 1s linear infinite;
    }
</style>
