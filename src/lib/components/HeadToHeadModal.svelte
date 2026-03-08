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

    function getOverallEdge(
        winsA: number,
        winsB: number,
        traderA: Trader | null,
        traderB: Trader | null,
    ) {
        if (!traderA || !traderB) {
            return {
                label: "Ready to Compare",
                detail: "เลือกเทรดเดอร์ 2 คนเพื่อเริ่มดวล",
                className:
                    "bg-white/15 text-white ring-1 ring-white/20 backdrop-blur",
            };
        }

        if (winsA === winsB) {
            return {
                label: "Even Match",
                detail: `${traderA.nickname} และ ${traderB.nickname} สูสีกัน`,
                className:
                    "bg-white/15 text-white ring-1 ring-white/20 backdrop-blur",
            };
        }

        const leader = winsA > winsB ? traderA.nickname : traderB.nickname;
        const className =
            winsA > winsB
                ? "bg-red-500/20 text-red-50 ring-1 ring-red-200/30 backdrop-blur"
                : "bg-amber-400/20 text-amber-50 ring-1 ring-amber-200/30 backdrop-blur";

        return {
            label: "Overall Edge",
            detail: `${leader} นำจาก metrics ที่ชนะมากกว่า`,
            className,
        };
    }

    function getTraderAccent(slot: "A" | "B") {
        return slot === "A"
            ? {
                  surface:
                      "border-red-900/60 bg-red-950/20",
                  subtle:
                      "bg-red-500/15 text-red-200",
                  text: "text-red-300",
                  ring: "ring-red-900/60",
                  button:
                      "from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600",
              }
            : {
                  surface:
                      "border-amber-900/60 bg-amber-950/20",
                  subtle:
                      "bg-amber-400/15 text-amber-200",
                  text: "text-amber-300",
                  ring: "ring-amber-900/60",
                  button:
                      "from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:via-amber-500 hover:to-yellow-400",
              };
    }

    function getValueCellClass(winner: CompareWinner, slot: "A" | "B") {
        if (winner === slot) {
            return slot === "A"
                ? "bg-red-600 text-white shadow-lg shadow-red-500/20 ring-1 ring-red-300/60"
                : "bg-amber-400 text-gray-950 shadow-lg shadow-amber-500/20 ring-1 ring-amber-100/80";
        }

        if (winner === "tie") {
            return "bg-slate-800/85 text-gray-100 ring-1 ring-slate-700";
        }

        return "bg-slate-900/85 text-gray-400 ring-1 ring-slate-800";
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
    $: overallEdge = getOverallEdge(winsA, winsB, traderA, traderB);
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
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
        on:click={close}
        on:keydown={(e) => e.key === "Escape" && close()}
        role="dialog"
        aria-modal="true"
        aria-label="Head-to-Head Comparison"
        tabindex="-1"
    >
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="animate-fade-in-up relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-slate-950/30 dark:bg-slate-950"
            on:click|stopPropagation
            on:keydown|stopPropagation
            role="document"
        >
            <div class="relative overflow-hidden bg-[linear-gradient(135deg,_#dc2626_0%,_#ef4444_52%,_#f97316_100%)] px-5 pb-5 pt-4 text-white sm:px-6">
                <div class="absolute inset-0 opacity-20">
                    <div class="duel-grid h-full w-full"></div>
                </div>

                <div class="relative flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                        <span class="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/80">
                            Head-to-Head
                        </span>
                        <div class="mt-2.5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h2 class="text-lg font-extrabold leading-tight tracking-[-0.02em] sm:text-xl">
                                    VS Duel Compare
                                </h2>
                                <p class="mt-1.5 max-w-md text-[11px] font-medium leading-4 text-white/70 sm:text-xs">
                                    เปรียบเทียบเทรดเดอร์แบบตัวต่อตัวให้เห็นชัดว่าใครเหนือกว่าในแต่ละ
                                    metric ก่อนอ่านบทวิเคราะห์จาก AI
                                </p>
                            </div>
                            <div class={`inline-flex max-w-[12rem] flex-col gap-0.5 rounded-lg px-3 py-2 ${overallEdge.className}`}>
                                <span class="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/60">
                                    {overallEdge.label}
                                </span>
                                <span class="text-[11px] font-semibold leading-4">
                                    {overallEdge.detail}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        class="relative z-10 rounded-full border border-white/20 bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white active:scale-95"
                        on:click={close}
                        aria-label="Close"
                    >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto bg-black p-4 sm:p-5">
                <section class="rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-lg shadow-black/40 backdrop-blur sm:p-4">
                    <div class="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
                        <div class={`rounded-xl border p-3 ring-1 ${getTraderAccent("A").surface} ${getTraderAccent("A").ring}`}>
                            <div class="flex items-center justify-between gap-2">
                                <div>
                                    <p class={`text-[10px] font-semibold uppercase tracking-[0.25em] ${getTraderAccent("A").text}`}>
                                        Trader A
                                    </p>
                                    <h3 class="mt-1 text-base font-black text-white">
                                        {traderA?.nickname || "Select Challenger"}
                                    </h3>
                                </div>
                                <span class={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getTraderAccent("A").subtle}`}>
                                    Left Side
                                </span>
                            </div>

                            <label
                                for="head-to-head-trader-a"
                                class="mt-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400"
                            >
                                เลือกเทรดเดอร์
                            </label>
                            <select
                                id="head-to-head-trader-a"
                                class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white outline-none ring-0 transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                                bind:value={selectedTraderAId}
                                on:change={(e) =>
                                    handleTraderSelect("A", e.currentTarget.value)}
                                disabled={loading}
                            >
                                <option value="">-- เลือกเทรดเดอร์ --</option>
                                {#each traders as trader}
                                    <option value={trader.id}>
                                        {trader.nickname} ({trader.points} pts)
                                    </option>
                                {/each}
                            </select>

                            <div class="mt-3 grid grid-cols-3 gap-1.5 text-center">
                                <div class="rounded-xl bg-slate-900 px-2 py-2 ring-1 ring-slate-800">
                                    <p class="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                                        Points
                                    </p>
                                    <p class="mt-1 text-sm font-black text-white">
                                        {traderA ? formatInteger(traderA.points) : "--"}
                                    </p>
                                </div>
                                <div class="rounded-xl bg-slate-900 px-2 py-2 ring-1 ring-slate-800">
                                    <p class="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                                        Profit
                                    </p>
                                    <p class="mt-1 text-sm font-black text-white">
                                        {traderA ? formatCurrency(traderA.profit) : "--"}
                                    </p>
                                </div>
                                <div class="rounded-xl bg-slate-900 px-2 py-2 ring-1 ring-slate-800">
                                    <p class="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                                        Win Rate
                                    </p>
                                    <p class="mt-1 text-sm font-black text-white">
                                        {traderA
                                            ? formatPercent(traderA.stats?.winRate)
                                            : "--"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col items-center justify-center gap-2 py-1 lg:py-0">
                            <div class="flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-black text-base font-black tracking-[0.2em] text-white shadow-xl shadow-red-500/20 ring-4 ring-slate-900">
                                VS
                            </div>
                            {#if selectedTraderAId && selectedTraderBId}
                                <button
                                    class="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white active:scale-95 disabled:opacity-40"
                                    on:click={swapTraders}
                                    disabled={loading}
                                    title="สลับ A/B"
                                >
                                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    สลับ
                                </button>
                            {/if}
                        </div>

                        <div class={`rounded-xl border p-3 ring-1 ${getTraderAccent("B").surface} ${getTraderAccent("B").ring}`}>
                            <div class="flex items-center justify-between gap-2">
                                <div>
                                    <p class={`text-[10px] font-semibold uppercase tracking-[0.25em] ${getTraderAccent("B").text}`}>
                                        Trader B
                                    </p>
                                    <h3 class="mt-1 text-base font-black text-white">
                                        {traderB?.nickname || "Select Opponent"}
                                    </h3>
                                </div>
                                <span class={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getTraderAccent("B").subtle}`}>
                                    Right Side
                                </span>
                            </div>

                            <label
                                for="head-to-head-trader-b"
                                class="mt-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400"
                            >
                                เลือกเทรดเดอร์
                            </label>
                            <select
                                id="head-to-head-trader-b"
                                class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white outline-none ring-0 transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
                                bind:value={selectedTraderBId}
                                on:change={(e) =>
                                    handleTraderSelect("B", e.currentTarget.value)}
                                disabled={loading}
                            >
                                <option value="">-- เลือกเทรดเดอร์ --</option>
                                {#each traders as trader}
                                    <option value={trader.id}>
                                        {trader.nickname} ({trader.points} pts)
                                    </option>
                                {/each}
                            </select>

                            <div class="mt-3 grid grid-cols-3 gap-1.5 text-center">
                                <div class="rounded-xl bg-slate-900 px-2 py-2 ring-1 ring-slate-800">
                                    <p class="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                                        Points
                                    </p>
                                    <p class="mt-1 text-sm font-black text-white">
                                        {traderB ? formatInteger(traderB.points) : "--"}
                                    </p>
                                </div>
                                <div class="rounded-xl bg-slate-900 px-2 py-2 ring-1 ring-slate-800">
                                    <p class="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                                        Profit
                                    </p>
                                    <p class="mt-1 text-sm font-black text-white">
                                        {traderB ? formatCurrency(traderB.profit) : "--"}
                                    </p>
                                </div>
                                <div class="rounded-xl bg-slate-900 px-2 py-2 ring-1 ring-slate-800">
                                    <p class="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                                        Win Rate
                                    </p>
                                    <p class="mt-1 text-sm font-black text-white">
                                        {traderB
                                            ? formatPercent(traderB.stats?.winRate)
                                            : "--"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex flex-wrap items-center gap-1.5 text-xs">
                            <div class="rounded-full bg-red-100 px-3 py-1.5 font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-200">
                                A ชนะ {winsA} metrics
                            </div>
                            <div class="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                                B ชนะ {winsB} metrics
                            </div>
                            <div class="rounded-full bg-slate-800 px-3 py-1.5 font-semibold text-slate-200">
                                เสมอ {ties}
                            </div>
                        </div>

                        {#if loading}
                            <button
                                class="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-200 shadow transition hover:bg-slate-800 active:scale-[0.98]"
                                on:click={cancelCompare}
                            >
                                <span class="h-2 w-2 animate-pulse rounded-full bg-orange-400"></span>
                                กำลังวิเคราะห์... (ยกเลิก)
                            </button>
                        {:else}
                            <button
                                class={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${getTraderAccent("A").button}`}
                                on:click={compare}
                                disabled={!canCompare}
                            >
                                {#if result}
                                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    สร้างใหม่
                                {:else}
                                    วิเคราะห์ด้วย AI
                                {/if}
                            </button>
                        {/if}
                    </div>

                    {#if selectionError}
                        <div class="mt-3 rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs font-medium text-red-200">
                            {selectionError}
                        </div>
                    {/if}
                </section>

                <section class="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-lg shadow-black/40 backdrop-blur sm:p-4">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p class="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                                Compare Board
                            </p>
                            <h3 class="mt-1 text-lg font-black text-white">
                                Metric-by-metric showdown
                            </h3>
                        </div>
                        <p class="max-w-sm text-xs leading-5 text-slate-400">
                            ตารางนี้ตัดสินจากข้อมูล leaderboard ปัจจุบันทันที โดยไม่ต้องรอผล
                            AI เพื่อให้เห็นฝั่งที่ได้เปรียบจริงในแต่ละมิติ
                        </p>
                    </div>

                    {#if readyToCompare && compareRows.length > 0}
                        <div class="mt-4 hidden gap-2 lg:flex lg:flex-col">
                            {#each compareRows as row}
                                <div class="grid grid-cols-[1fr_140px_1fr] items-center gap-2">
                                    <div class={`rounded-xl px-3.5 py-2.5 transition ${getValueCellClass(row.winner, "A")}`}>
                                        <div class="flex items-center justify-between gap-3">
                                            <div>
                                                <p class="text-[9px] uppercase tracking-[0.22em] opacity-70">
                                                    {traderA?.nickname || "Trader A"}
                                                </p>
                                                <p class="mt-1 text-lg font-black">
                                                    {row.formattedA}
                                                </p>
                                            </div>
                                            {#if row.winner === "A"}
                                                <span class="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">
                                                    Winner
                                                </span>
                                            {/if}
                                        </div>
                                    </div>

                                    <div class="relative flex h-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-black px-3 py-2.5 text-center">
                                        <div class="absolute inset-y-1 left-0 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent dark:via-slate-700"></div>
                                        <div class="absolute inset-y-1 right-0 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent dark:via-slate-700"></div>
                                        <div>
                                            <p class="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                                {row.key}
                                            </p>
                                            <p class="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-200">
                                                {row.label}
                                            </p>
                                            <p class="mt-1 text-[10px] text-slate-400">
                                                {row.betterDirection === "higher"
                                                    ? "Higher is better"
                                                    : "Lower is better"}
                                            </p>
                                        </div>
                                    </div>

                                    <div class={`rounded-xl px-3.5 py-2.5 transition ${getValueCellClass(row.winner, "B")}`}>
                                        <div class="flex items-center justify-between gap-3">
                                            {#if row.winner === "B"}
                                                <span class="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">
                                                    Winner
                                                </span>
                                            {/if}
                                            <div class="ml-auto text-right">
                                                <p class="text-[9px] uppercase tracking-[0.22em] opacity-70">
                                                    {traderB?.nickname || "Trader B"}
                                                </p>
                                                <p class="mt-1 text-lg font-black">
                                                    {row.formattedB}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <div class="mt-4 grid gap-2 lg:hidden">
                            {#each compareRows as row}
                                <div class="rounded-xl border border-slate-800 bg-black p-3">
                                    <div class="flex items-center justify-between gap-2">
                                        <div>
                                            <p class="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                                {row.key}
                                            </p>
                                            <h4 class="mt-1 text-sm font-black text-white">
                                                {row.label}
                                            </h4>
                                        </div>
                                        <span class="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                                            {row.betterDirection === "higher"
                                                ? "Higher wins"
                                                : "Lower wins"}
                                        </span>
                                    </div>

                                    <div class="mt-2.5 grid gap-2">
                                        <div class={`rounded-xl px-3 py-2.5 ${getValueCellClass(row.winner, "A")}`}>
                                            <div class="flex items-center justify-between gap-2">
                                                <div>
                                                    <p class="text-[9px] uppercase tracking-[0.2em] opacity-70">
                                                        {traderA?.nickname || "Trader A"}
                                                    </p>
                                                    <p class="mt-1 text-base font-black">
                                                        {row.formattedA}
                                                    </p>
                                                </div>
                                                {#if row.winner === "A"}
                                                    <span class="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]">
                                                        Winner
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>

                                        <div class={`rounded-xl px-3 py-2.5 ${getValueCellClass(row.winner, "B")}`}>
                                            <div class="flex items-center justify-between gap-2">
                                                <div>
                                                    <p class="text-[9px] uppercase tracking-[0.2em] opacity-70">
                                                        {traderB?.nickname || "Trader B"}
                                                    </p>
                                                    <p class="mt-1 text-base font-black">
                                                        {row.formattedB}
                                                    </p>
                                                </div>
                                                {#if row.winner === "B"}
                                                    <span class="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]">
                                                        Winner
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>

                                        {#if row.winner === "tie"}
                                            <div class="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-300">
                                                สูสีใน metric นี้
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div class="mt-4 rounded-xl border border-dashed border-slate-700 bg-black px-5 py-8 text-center">
                            <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Waiting for Matchup
                            </p>
                            <h4 class="mt-2 text-base font-black text-white">
                                เลือกเทรดเดอร์ 2 คนเพื่อเปิด Compare Board
                            </h4>
                            <p class="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">
                                เมื่อเลือกครบทั้งสองฝั่ง ตารางเปรียบเทียบจะโชว์ทันทีว่าใครนำใน
                                metrics หลัก เช่น profit, win rate, drawdown และความสม่ำเสมอ
                            </p>
                        </div>
                    {/if}
                </section>

                <section class="relative mt-4 overflow-hidden rounded-[1.6rem] border border-slate-800 bg-slate-950 p-3 shadow-lg shadow-black/40 sm:p-4">
                    <div class="absolute inset-0 opacity-20">
                        <div class="commentary-grid h-full w-full"></div>
                    </div>

                    <div class="relative flex flex-col gap-3 rounded-[1.25rem] border border-slate-800 bg-black/60 p-3 backdrop-blur-sm sm:p-4">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div class="flex items-start gap-3">
                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-black shadow-lg shadow-slate-900/15">
                                    AI
                                </div>
                                <div>
                                    <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-300/80">
                                        AI Commentary
                                    </p>
                                    <h3 class="mt-1 text-[1.05rem] font-black tracking-[-0.02em] text-white sm:text-[1.15rem]">
                                        Strategic read after the numbers
                                    </h3>
                                    <p class="mt-1 text-xs leading-5 text-slate-400">
                                        สรุป verdict, จุดแข็งของแต่ละฝั่ง และ insight สั้นๆ หลังจากดู compare
                                        board ด้านบน
                                    </p>
                                </div>
                            </div>

                            <div class="inline-flex items-center gap-2 self-start rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200">
                                <span class="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                                Analyst Desk
                            </div>
                        </div>

                        {#if readyToCompare}
                            <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                <span class="rounded-full bg-red-500/15 px-3 py-1 text-red-200">
                                    {traderA?.nickname || "Trader A"}
                                </span>
                                <span class="text-slate-500">vs</span>
                                <span class="rounded-full bg-amber-400/15 px-3 py-1 text-amber-200">
                                    {traderB?.nickname || "Trader B"}
                                </span>
                            </div>
                        {/if}
                    </div>

                    {#if readyToCompare}
                        <div class="relative mt-4 overflow-hidden rounded-[1.35rem] border border-slate-800 bg-black p-4 shadow-[0_20px_60px_-32px_rgba(0,0,0,0.75)] sm:p-5">
                            <div class="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-orange-500/8 to-transparent"></div>

                            {#if loading && !result}
                                <div class="absolute inset-0 z-10 bg-black/80 backdrop-blur-[2px]"></div>
                            {/if}

                            {#if loading}
                                <div class="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-black">
                                    <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
                                    Streaming
                                </div>
                            {/if}

                            {#if result}
                                <div class="relative z-[1]">
                                    <div class="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                                        <div>
                                            <p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                                Analysis Output
                                            </p>
                                            <p class="mt-1 text-sm font-semibold text-slate-200">
                                                Commentary generated from current leaderboard metrics
                                            </p>
                                        </div>
                                        <div class="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                                            Read Mode
                                        </div>
                                    </div>

                                    <div class="commentary-prose prose prose-sm max-w-none text-slate-300 prose-invert">
                                        {@html sanitize(result)}
                                    </div>
                                </div>
                            {:else if loading}
                                <div class="space-y-4">
                                    <div class="flex items-center gap-2">
                                        <div class="h-2.5 w-2.5 rounded-full bg-orange-400"></div>
                                        <div class="h-4 w-40 rounded-full bg-slate-800"></div>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="h-4 w-full rounded-full bg-slate-800"></div>
                                        <div class="h-4 w-11/12 rounded-full bg-slate-800"></div>
                                        <div class="h-4 w-10/12 rounded-full bg-slate-800"></div>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="h-4 w-2/3 rounded-full bg-slate-800"></div>
                                        <div class="h-4 w-full rounded-full bg-slate-800"></div>
                                        <div class="h-4 w-9/12 rounded-full bg-slate-800"></div>
                                    </div>
                                </div>
                            {:else}
                                <div class="rounded-[1.2rem] border border-dashed border-slate-700 bg-black px-4 py-7 text-center">
                                    <p class="text-[10px] font-semibold uppercase tracking-[0.25em] text-orange-300">
                                        Ready
                                    </p>
                                    <h4 class="mt-2 text-base font-black tracking-[-0.02em] text-white">
                                        AI กำลังเตรียมบทวิเคราะห์...
                                    </h4>
                                    <p class="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">
                                        ระบบจะสรุป verdict สั้น, จุดแข็งของแต่ละฝั่ง และ insight ต่อยอดจาก compare board ด้านบน
                                    </p>
                                </div>
                            {/if}
                        </div>

                        {#if aiError}
                            <div class="mt-3 rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs font-medium text-red-200">
                                {aiError}
                            </div>
                        {/if}
                    {:else}
                        <div class="mt-4 rounded-xl border border-dashed border-slate-700 bg-black px-5 py-7 text-center">
                            <p class="text-xs leading-5 text-slate-400">
                                AI Commentary จะพร้อมใช้งานเมื่อเลือกเทรดเดอร์ครบ 2 คน
                            </p>
                        </div>
                    {/if}
                </section>
            </div>
        </div>
    </div>
{/if}

<style>
    .duel-grid {
        background-image:
            linear-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
        background-size: 32px 32px;
        mask-image: radial-gradient(circle at center, black 30%, transparent 85%);
    }
    .commentary-grid {
        background-image:
            linear-gradient(rgba(249, 115, 22, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.08) 1px, transparent 1px);
        background-size: 24px 24px;
        mask-image: linear-gradient(to bottom, black 18%, transparent 100%);
    }
    :global(.commentary-prose h1),
    :global(.commentary-prose h2),
    :global(.commentary-prose h3) {
        margin-top: 1.15rem;
        margin-bottom: 0.55rem;
        font-weight: 800;
        letter-spacing: -0.025em;
        color: rgb(248 250 252);
    }
    :global(.commentary-prose h1:first-child),
    :global(.commentary-prose h2:first-child),
    :global(.commentary-prose h3:first-child) {
        margin-top: 0;
    }
    :global(.commentary-prose p) {
        margin-top: 0.65rem;
        margin-bottom: 0.65rem;
        line-height: 1.75;
    }
    :global(.commentary-prose strong) {
        font-weight: 700;
        color: rgb(255 255 255);
    }
    :global(.commentary-prose ul) {
        margin: 0.85rem 0;
        padding-left: 1rem;
    }
    :global(.commentary-prose li) {
        margin: 0.35rem 0;
        padding-left: 0.2rem;
    }
    :global(.commentary-prose li::marker) {
        color: rgb(234 88 12);
    }
    :global(.commentary-prose hr) {
        margin: 1rem 0;
        border-color: rgb(51 65 85);
    }
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
