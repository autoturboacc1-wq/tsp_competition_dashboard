<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { marked } from "marked";
    import DOMPurify from "isomorphic-dompurify";
    import type { LeaderboardEntry } from "$lib/mock/leaderboard";

    type Trader = LeaderboardEntry;
    type CompareWinner = "A" | "B" | "tie";
    type BetterDirection = "higher" | "lower";
    type CompareMetric = {
        key: string;
        label: string;
        betterDirection: BetterDirection;
        accessor: (trader: Trader) => number | null | undefined;
        formatter: (value: number | null | undefined) => string;
        compareAccessor?: (value: number) => number;
    };
    type CompareRow = {
        key: string;
        label: string;
        betterDirection: BetterDirection;
        rawA: number | null | undefined;
        rawB: number | null | undefined;
        formattedA: string;
        formattedB: string;
        winner: CompareWinner;
    };

    const sanitize = (md: string) =>
        DOMPurify.sanitize(marked.parse(md) as string);

    const DUPLICATE_SELECTION_MESSAGE = "กรุณาเลือกเทรดเดอร์คนละคน";

    const formatNumber = (value: number | null | undefined, digits = 1) =>
        value == null
            ? "N/A"
            : value.toLocaleString("en-US", {
                  minimumFractionDigits: digits,
                  maximumFractionDigits: digits,
              });

    const formatInteger = (value: number | null | undefined) =>
        value == null ? "N/A" : value.toLocaleString("en-US");

    const formatCurrency = (value: number | null | undefined) =>
        value == null
            ? "N/A"
            : `$${value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              })}`;

    const formatPercent = (value: number | null | undefined) =>
        value == null ? "N/A" : `${formatNumber(value, 1)}%`;

    const compareMetrics: CompareMetric[] = [
        {
            key: "points",
            label: "Points",
            betterDirection: "higher",
            accessor: (trader) => trader.points,
            formatter: formatInteger,
        },
        {
            key: "profit",
            label: "Profit",
            betterDirection: "higher",
            accessor: (trader) => trader.profit,
            formatter: formatCurrency,
        },
        {
            key: "winRate",
            label: "Win Rate",
            betterDirection: "higher",
            accessor: (trader) => trader.stats?.winRate,
            formatter: formatPercent,
        },
        {
            key: "profitFactor",
            label: "Profit Factor",
            betterDirection: "higher",
            accessor: (trader) => trader.stats?.profitFactor,
            formatter: (value) => formatNumber(value, 2),
        },
        {
            key: "rrRatio",
            label: "R:R Ratio",
            betterDirection: "higher",
            accessor: (trader) => trader.stats?.rrRatio,
            formatter: (value) => formatNumber(value, 2),
        },
        {
            key: "maxDrawdown",
            label: "Max Drawdown",
            betterDirection: "lower",
            accessor: (trader) => trader.stats?.maxDrawdown,
            formatter: formatPercent,
        },
        {
            key: "totalTrades",
            label: "Total Trades",
            betterDirection: "higher",
            accessor: (trader) => trader.stats?.totalTrades,
            formatter: formatInteger,
        },
        {
            key: "avgWin",
            label: "Avg Win",
            betterDirection: "higher",
            accessor: (trader) => trader.stats?.avgWin,
            formatter: formatCurrency,
        },
        {
            key: "avgLoss",
            label: "Avg Loss",
            betterDirection: "lower",
            accessor: (trader) => trader.stats?.avgLoss,
            formatter: formatCurrency,
            compareAccessor: (value) => Math.abs(value),
        },
    ];

    export let show = false;
    export let traders: Trader[] = [];

    const dispatch = createEventDispatcher();

    let selectedTraderAId = "";
    let selectedTraderBId = "";
    let loading = false;
    let result = "";
    let selectionError = "";
    let aiError = "";
    let abortController: AbortController | null = null;
    let lastComparedKey = "";

    function close() {
        abortController?.abort();
        show = false;
        selectedTraderAId = "";
        selectedTraderBId = "";
        selectionError = "";
        lastComparedKey = "";
        resetAiState();
        dispatch("close");
    }

    function resetAiState() {
        result = "";
        aiError = "";
        loading = false;
    }

    function handleTraderSelect(slot: "A" | "B", value: string) {
        if (slot === "A") {
            selectedTraderAId = value;
        } else {
            selectedTraderBId = value;
        }

        if (selectionError === DUPLICATE_SELECTION_MESSAGE) {
            selectionError = "";
        }
        lastComparedKey = "";
        abortController?.abort();
        resetAiState();
    }

    function swapTraders() {
        const tempA = selectedTraderAId;
        selectedTraderAId = selectedTraderBId;
        selectedTraderBId = tempA;
        lastComparedKey = "";
        resetAiState();
    }

    function cancelCompare() {
        abortController?.abort();
        loading = false;
    }

    function getComparableValue(
        value: number | null | undefined,
        metric: CompareMetric,
    ) {
        if (value == null) return null;
        return metric.compareAccessor ? metric.compareAccessor(value) : value;
    }

    function getWinner(
        valueA: number | null,
        valueB: number | null,
        betterDirection: BetterDirection,
    ): CompareWinner {
        if (valueA == null && valueB == null) return "tie";
        if (valueA == null) return "B";
        if (valueB == null) return "A";
        if (valueA === valueB) return "tie";

        if (betterDirection === "higher") {
            return valueA > valueB ? "A" : "B";
        }

        return valueA < valueB ? "A" : "B";
    }

    function buildCompareRows(
        traderA: Trader | null,
        traderB: Trader | null,
    ): CompareRow[] {
        if (!traderA || !traderB) return [];

        return compareMetrics
            .map((metric) => {
                const rawA = metric.accessor(traderA);
                const rawB = metric.accessor(traderB);

                if (rawA == null && rawB == null) {
                    return null;
                }

                const comparableA = getComparableValue(rawA, metric);
                const comparableB = getComparableValue(rawB, metric);

                return {
                    key: metric.key,
                    label: metric.label,
                    betterDirection: metric.betterDirection,
                    rawA,
                    rawB,
                    formattedA: metric.formatter(rawA),
                    formattedB: metric.formatter(rawB),
                    winner: getWinner(
                        comparableA,
                        comparableB,
                        metric.betterDirection,
                    ),
                } satisfies CompareRow;
            })
            .filter((row): row is CompareRow => row !== null);
    }

    function getWinnerCount(rows: CompareRow[], winner: "A" | "B") {
        return rows.filter((row) => row.winner === winner).length;
    }

    function getTieCount(rows: CompareRow[]) {
        return rows.filter((row) => row.winner === "tie").length;
    }

    async function compare() {
        if (!traderA || !traderB) return;

        if (traderA.id === traderB.id) {
            selectionError = DUPLICATE_SELECTION_MESSAGE;
            return;
        }

        abortController?.abort();
        abortController = new AbortController();

        loading = true;
        selectionError = "";
        aiError = "";
        result = "";

        try {
            const response = await fetch("/api/head-to-head", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ traderAId: traderA?.id, traderBId: traderB?.id }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                const data = await response.json();
                aiError = data.error?.message || "เกิดข้อผิดพลาด";
                return;
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No reader");

            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") break;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            aiError = parsed.error;
                            break;
                        }
                        if (parsed.content) {
                            result += parsed.content;
                        }
                    } catch {
                        // Ignore malformed stream chunks.
                    }
                }

                if (aiError) break;
            }
        } catch (err) {
            if ((err as Error)?.name === "AbortError") return;
            aiError = "ไม่สามารถเชื่อมต่อกับ AI ได้ กรุณาลองใหม่";
        } finally {
            loading = false;
            abortController = null;
        }
    }

    $: traderA = traders.find((trader) => trader.id === selectedTraderAId) ?? null;
    $: traderB = traders.find((trader) => trader.id === selectedTraderBId) ?? null;
    $: duplicateSelection =
        selectedTraderAId !== "" && selectedTraderAId === selectedTraderBId;
    $: if (!duplicateSelection && selectionError === DUPLICATE_SELECTION_MESSAGE) {
        selectionError = "";
    }
    $: compareRows = duplicateSelection ? [] : buildCompareRows(traderA, traderB);
    $: winsA = getWinnerCount(compareRows, "A");
    $: winsB = getWinnerCount(compareRows, "B");
    $: ties = getTieCount(compareRows);
    $: readyToCompare = !!traderA && !!traderB && !duplicateSelection;
    $: canCompare = readyToCompare && !loading;

    // Auto-compare when a new pair is selected
    $: {
        const key = `${selectedTraderAId}:${selectedTraderBId}`;
        const isReady = !!selectedTraderAId && !!selectedTraderBId && selectedTraderAId !== selectedTraderBId;
        if (isReady && key !== lastComparedKey && !loading) {
            lastComparedKey = key;
            compare();
        }
    }
</script>

{#if show}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
        on:click={close}
        on:keydown={(e) => e.key === "Escape" && close()}
        role="dialog"
        aria-modal="true"
        aria-label="Head-to-Head Comparison"
        tabindex="-1"
    >
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="animate-fade-in-up relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/[0.08]"
            on:click|stopPropagation
            on:keydown|stopPropagation
            role="document"
        >
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div class="flex items-center gap-3">
                    <h2 class="text-sm font-semibold text-white tracking-wide">Head-to-Head</h2>
                    {#if readyToCompare}
                        <div class="flex items-center gap-1.5 text-[11px] text-white/50">
                            <span class="text-white/70">{winsA}</span>
                            <span>-</span>
                            <span class="text-white/70">{winsB}</span>
                            {#if ties > 0}
                                <span class="text-white/30 ml-1">({ties} tie)</span>
                            {/if}
                        </div>
                    {/if}
                </div>
                <button
                    class="text-white/40 hover:text-white/80 transition-colors p-1"
                    on:click={close}
                    aria-label="Close"
                >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-5 space-y-5">
                <!-- Trader Selection -->
                <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                    <div>
                        <label for="head-to-head-trader-a" class="block text-[10px] font-medium uppercase tracking-widest text-white/30 mb-1.5">Trader A</label>
                        <select
                            id="head-to-head-trader-a"
                            class="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-xs text-white outline-none transition focus:border-amber-500/50"
                            bind:value={selectedTraderAId}
                            on:change={(e) => handleTraderSelect("A", e.currentTarget.value)}
                            disabled={loading}
                        >
                            <option value="">เลือก...</option>
                            {#each traders as trader}
                                <option value={trader.id}>{trader.nickname} ({trader.points} pts)</option>
                            {/each}
                        </select>
                    </div>

                    <button
                        class="mb-0.5 p-1.5 rounded-md text-white/20 hover:text-white/60 hover:bg-white/[0.05] transition-all disabled:opacity-30"
                        on:click={swapTraders}
                        disabled={loading || !selectedTraderAId || !selectedTraderBId}
                        title="สลับ"
                    >
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>

                    <div>
                        <label for="head-to-head-trader-b" class="block text-[10px] font-medium uppercase tracking-widest text-white/30 mb-1.5">Trader B</label>
                        <select
                            id="head-to-head-trader-b"
                            class="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-xs text-white outline-none transition focus:border-amber-500/50"
                            bind:value={selectedTraderBId}
                            on:change={(e) => handleTraderSelect("B", e.currentTarget.value)}
                            disabled={loading}
                        >
                            <option value="">เลือก...</option>
                            {#each traders as trader}
                                <option value={trader.id}>{trader.nickname} ({trader.points} pts)</option>
                            {/each}
                        </select>
                    </div>
                </div>

                {#if selectionError}
                    <p class="text-xs text-red-400">{selectionError}</p>
                {/if}

                <!-- Compare Table -->
                {#if readyToCompare && compareRows.length > 0}
                    <div class="rounded-xl border border-white/[0.06] overflow-hidden">
                        <table class="w-full text-xs">
                            <thead>
                                <tr class="border-b border-white/[0.06] bg-white/[0.02]">
                                    <th class="py-2 px-3 text-left text-[10px] font-medium uppercase tracking-widest text-white/30">Metric</th>
                                    <th class="py-2 px-3 text-right text-[10px] font-medium uppercase tracking-widest text-white/30">{traderA?.nickname || 'A'}</th>
                                    <th class="py-2 px-3 text-right text-[10px] font-medium uppercase tracking-widest text-white/30">{traderB?.nickname || 'B'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each compareRows as row}
                                    <tr class="border-b border-white/[0.04] last:border-0">
                                        <td class="py-2.5 px-3 text-white/50">
                                            {row.label}
                                            <span class="text-[9px] text-white/20 ml-1">{row.betterDirection === 'higher' ? '(H)' : '(L)'}</span>
                                        </td>
                                        <td class="py-2.5 px-3 text-right font-mono tabular-nums {row.winner === 'A' ? 'text-amber-400 font-semibold' : 'text-white/40'}">
                                            {row.formattedA}
                                        </td>
                                        <td class="py-2.5 px-3 text-right font-mono tabular-nums {row.winner === 'B' ? 'text-amber-400 font-semibold' : 'text-white/40'}">
                                            {row.formattedB}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {:else if !readyToCompare}
                    <div class="py-10 text-center text-xs text-white/20">
                        เลือกเทรดเดอร์ 2 คนเพื่อเปรียบเทียบ
                    </div>
                {/if}

                <!-- AI Commentary -->
                {#if readyToCompare}
                    <div class="border-t border-white/[0.06] pt-4">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-medium uppercase tracking-widest text-white/30">AI Analysis</span>
                                {#if loading}
                                    <span class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                {/if}
                            </div>
                            {#if loading}
                                <button
                                    class="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                                    on:click={cancelCompare}
                                >
                                    ยกเลิก
                                </button>
                            {:else if result}
                                <button
                                    class="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                                    on:click={compare}
                                    disabled={!canCompare}
                                >
                                    สร้างใหม่
                                </button>
                            {/if}
                        </div>

                        {#if result}
                            <div class="ai-prose text-xs leading-relaxed text-white/60">
                                {@html sanitize(result)}
                            </div>
                        {:else if loading}
                            <div class="space-y-2.5 animate-pulse">
                                <div class="h-3 w-3/4 rounded bg-white/[0.04]"></div>
                                <div class="h-3 w-full rounded bg-white/[0.04]"></div>
                                <div class="h-3 w-5/6 rounded bg-white/[0.04]"></div>
                                <div class="h-3 w-2/3 rounded bg-white/[0.04]"></div>
                            </div>
                        {:else}
                            <p class="text-xs text-white/20">กำลังเตรียมบทวิเคราะห์...</p>
                        {/if}

                        {#if aiError}
                            <p class="mt-3 text-xs text-red-400/80">{aiError}</p>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    :global(.ai-prose h1),
    :global(.ai-prose h2),
    :global(.ai-prose h3) {
        margin-top: 1rem;
        margin-bottom: 0.4rem;
        font-weight: 600;
        font-size: 0.8rem;
        color: rgba(255 255 255 / 0.8);
    }
    :global(.ai-prose h1:first-child),
    :global(.ai-prose h2:first-child),
    :global(.ai-prose h3:first-child) {
        margin-top: 0;
    }
    :global(.ai-prose p) {
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        line-height: 1.7;
    }
    :global(.ai-prose strong) {
        font-weight: 600;
        color: rgba(255 255 255 / 0.8);
    }
    :global(.ai-prose ul) {
        margin: 0.5rem 0;
        padding-left: 1rem;
    }
    :global(.ai-prose li) {
        margin: 0.25rem 0;
    }
    :global(.ai-prose li::marker) {
        color: rgba(255 255 255 / 0.2);
    }
    :global(.ai-prose hr) {
        margin: 0.75rem 0;
        border-color: rgba(255 255 255 / 0.06);
    }
</style>
