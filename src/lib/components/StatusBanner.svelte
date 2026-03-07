<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { AsyncBannerTone } from "$lib/async-state";

    export let tone: AsyncBannerTone = "info";
    export let title = "";
    export let message = "";
    export let actionLabel = "";
    export let compact = false;

    const dispatch = createEventDispatcher<{ action: void }>();

    const toneClasses: Record<
        AsyncBannerTone,
        { wrapper: string; icon: string; button: string }
    > = {
        info: {
            wrapper:
                "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-100",
            icon: "text-blue-600 dark:text-blue-300",
            button:
                "border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/50",
        },
        warning: {
            wrapper:
                "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100",
            icon: "text-amber-600 dark:text-amber-300",
            button:
                "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50",
        },
        error: {
            wrapper:
                "border-red-200 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-100",
            icon: "text-red-600 dark:text-red-300",
            button:
                "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-900/50",
        },
        success: {
            wrapper:
                "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-100",
            icon: "text-emerald-600 dark:text-emerald-300",
            button:
                "border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-900/50",
        },
    };
</script>

<div
    class={`rounded-xl border px-4 ${
        compact ? "py-3" : "py-4"
    } shadow-sm ${toneClasses[tone].wrapper}`}
>
    <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
            <div class={`mt-0.5 ${toneClasses[tone].icon}`}>
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.8"
                        d="M12 9v3.75m0 3.75h.007v.008H12v-.008z"
                    />
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.8"
                        d="M10.29 3.86L1.82 18a2.25 2.25 0 001.93 3.38h16.5A2.25 2.25 0 0022.18 18l-8.47-14.14a2.25 2.25 0 00-3.42 0z"
                    />
                </svg>
            </div>

            <div>
                {#if title}
                    <p class="text-sm font-semibold">{title}</p>
                {/if}
                <p class={`${title ? "mt-1" : ""} text-sm opacity-90`}>
                    {message}
                </p>
            </div>
        </div>

        {#if actionLabel}
            <button
                class={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${toneClasses[tone].button}`}
                on:click={() => dispatch("action")}
            >
                {actionLabel}
            </button>
        {/if}
    </div>
</div>
