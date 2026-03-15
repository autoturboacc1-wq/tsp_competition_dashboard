<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { marked } from "marked";
    import { browser } from "$app/environment";
    import {
        ASYNC_COPY,
        normalizeAiError,
        type AiApiError,
    } from "$lib/async-state";
    import StatusBanner from "$lib/components/StatusBanner.svelte";

    let DOMPurify: any;
    if (browser) {
        import("dompurify").then((m) => (DOMPurify = m.default));
    }

    const sanitize = (md: string) => {
        const html = marked.parse(md) as string;
        return DOMPurify ? DOMPurify.sanitize(html) : html;
    };

    const CUSTOM_PROMPT_MAX = 500;
    const CACHE_TTL = 5 * 60 * 1000;

    // Module-level cache persists across open/close cycles
    const analysisCache = new Map<
        string,
        { result: string; timestamp: number }
    >();

    function getCacheKey(
        traderId: string,
        type: string,
        prompt?: string,
    ): string {
        return `${traderId}:${type}:${prompt || ""}`;
    }

    export let trader: any;
    export let show = false;

    const dispatch = createEventDispatcher();

    let loading = false;
    let analysisResult = "";
    let customPrompt = "";
    let selectedType = "";
    let error: AiApiError | null = null;
    let copied = false;
    let lastRequest: { type: string; prompt?: string } | null = null;

    const analysisButtons = [
        {
            type: "overview",
            icon: "🎯",
            label: "ภาพรวม",
            desc: "วิเคราะห์ Performance",
        },
        {
            type: "winrate",
            icon: "📊",
            label: "Win Rate",
            desc: "วิเคราะห์อัตราชนะ",
        },
        {
            type: "risk",
            icon: "⚠️",
            label: "ความเสี่ยง",
            desc: "วิเคราะห์ Drawdown",
        },
        { type: "trend", icon: "📈", label: "แนวโน้ม", desc: "Trading Style" },
        {
            type: "compare",
            icon: "🔮",
            label: "เทียบมาตรฐาน",
            desc: "เทียบกับมืออาชีพ",
        },
        {
            type: "daily",
            icon: "📅",
            label: "Daily Pattern",
            desc: "วิเคราะห์ P/L รายวัน",
        },
        {
            type: "lotsize",
            icon: "⚖️",
            label: "Lot Size",
            desc: "Position Sizing",
        },
    ];

    async function analyze(type: string, prompt?: string) {
        // Check cache first
        const cacheKey = getCacheKey(
            trader?.id || "",
            type,
            prompt,
        );
        const cached = analysisCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            analysisResult = cached.result;
            selectedType = type;
            lastRequest = { type, prompt };
            return;
        }

        loading = true;
        error = null;
        selectedType = type;
        lastRequest = { type, prompt };
        copied = false;
        analysisResult = "";

        try {
            const response = await fetch("/api/ai-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    traderId: trader?.id,
                    analysisType: type,
                    customPrompt: prompt,
                }),
            });

            // Non-OK responses are still JSON errors
            if (!response.ok) {
                const data = await response.json();
                error = normalizeAiError(data);
                return;
            }

            // Read SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No reader");

            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                // Keep the last potentially incomplete line in buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") break;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            error = {
                                code: "provider_unavailable",
                                message: parsed.error,
                                retryable: true,
                            };
                            break;
                        }
                        if (parsed.content) {
                            analysisResult += parsed.content;
                        }
                    } catch {
                        // skip malformed chunks
                    }
                }

                if (error) break;
            }

            // Cache successful result
            if (analysisResult && !error) {
                analysisCache.set(cacheKey, {
                    result: analysisResult,
                    timestamp: Date.now(),
                });
            }
        } catch (e) {
            error = {
                code: "provider_unavailable",
                message: "ไม่สามารถเชื่อมต่อกับ AI ได้ กรุณาลองใหม่",
                retryable: true,
            };
        } finally {
            loading = false;
        }
    }

    function handleCustomSubmit() {
        if (customPrompt.trim()) {
            analyze("custom", customPrompt.trim());
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleCustomSubmit();
        }
    }

    function close() {
        show = false;
        analysisResult = "";
        error = null;
        customPrompt = "";
        selectedType = "";
        copied = false;
        lastRequest = null;
        dispatch("close");
    }

    function retryAnalysis() {
        if (lastRequest) {
            analyze(lastRequest.type, lastRequest.prompt);
        }
    }

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(analysisResult);
            copied = true;
            setTimeout(() => {
                copied = false;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }

    $: isInitialLoading = loading && !analysisResult;
    $: isRefreshingResult = loading && Boolean(analysisResult);
    $: promptCharsLeft = CUSTOM_PROMPT_MAX - customPrompt.length;
</script>

{#if show}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        on:click={close}
        on:keydown={(e) => e.key === "Escape" && close()}
        role="dialog"
        aria-modal="true"
        aria-label="AI Analysis Modal"
        tabindex="-1"
    >
        <!-- Modal -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up"
            on:click|stopPropagation
            on:keydown|stopPropagation
            role="document"
        >
            <!-- Header -->
            <div
                class="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600"
            >
                <div class="flex items-center gap-3">
                    <span class="text-2xl">🤖</span>
                    <div>
                        <h2 class="text-lg font-bold text-white">
                            AI Analysis
                        </h2>
                        <p class="text-sm text-white/80">
                            วิเคราะห์ข้อมูล {trader?.nickname || "Trader"}
                        </p>
                    </div>
                </div>
                <button
                    class="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all active:scale-95"
                    on:click={close}
                    aria-label="ปิด"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <!-- Analysis Buttons -->
                <div class="mb-6">
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        เลือกประเภทการวิเคราะห์:
                    </p>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {#each analysisButtons as btn}
                            <button
                                class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 {selectedType ===
                                btn.type
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-dark-border hover:border-purple-300 dark:hover:border-purple-700'}"
                                on:click={() => analyze(btn.type)}
                                disabled={loading}
                            >
                                <span class="text-2xl">{btn.icon}</span>
                                <span
                                    class="font-medium text-gray-900 dark:text-white text-sm"
                                    >{btn.label}</span
                                >
                                <span
                                    class="text-xs text-gray-500 dark:text-gray-400"
                                    >{btn.desc}</span
                                >
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Custom Prompt -->
                <div class="mb-6">
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        หรือถามคำถามเอง:
                    </p>
                    <div class="flex gap-2">
                        <input
                            type="text"
                            bind:value={customPrompt}
                            on:keydown={handleKeydown}
                            maxlength={CUSTOM_PROMPT_MAX}
                            placeholder="เช่น: Session ไหนที่ควรเน้นเทรด?"
                            class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                            disabled={loading}
                        />
                        <button
                            class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            on:click={handleCustomSubmit}
                            disabled={loading || !customPrompt.trim()}
                        >
                            ถาม
                        </button>
                    </div>
                    {#if customPrompt.length > 0}
                        <p
                            class="text-xs mt-1 text-right {promptCharsLeft < 50
                                ? 'text-orange-500'
                                : 'text-gray-400 dark:text-gray-500'}"
                        >
                            {promptCharsLeft} ตัวอักษร
                        </p>
                    {/if}
                </div>

                <!-- Divider -->
                {#if loading || analysisResult || error}
                    <div
                        class="border-t border-gray-100 dark:border-dark-border my-6"
                    ></div>
                {/if}

                <!-- Loading State -->
                {#if isInitialLoading}
                    <div
                        class="flex flex-col items-center justify-center py-12"
                    >
                        <div class="relative">
                            <div
                                class="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full"
                            ></div>
                            <div
                                class="w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full absolute inset-0 animate-spin"
                            ></div>
                        </div>
                        <p
                            class="mt-4 text-gray-500 dark:text-gray-400 animate-pulse"
                        >
                            กำลังวิเคราะห์...
                        </p>
                    </div>
                {/if}

                {#if isRefreshingResult}
                    <div class="mb-4">
                        <StatusBanner
                            tone="info"
                            compact
                            title={ASYNC_COPY.refreshing}
                            message="กำลังอัปเดตคำวิเคราะห์ล่าสุด โดยคงผลลัพธ์เดิมไว้"
                        />
                    </div>
                {/if}

                <!-- Error State -->
                {#if error && !loading}
                    <div class="mb-4">
                        <StatusBanner
                            tone="error"
                            title="วิเคราะห์ด้วย AI ไม่สำเร็จ"
                            message={error.message}
                            actionLabel={error.retryable
                                ? ASYNC_COPY.retry
                                : ""}
                            on:action={retryAnalysis}
                        />
                    </div>
                {/if}

                <!-- Analysis Result -->
                {#if analysisResult}
                    <div
                        class="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-xl p-6 border border-purple-100 dark:border-purple-800/30"
                    >
                        <!-- Copy Button -->
                        <div class="flex justify-end mb-4">
                            <button
                                on:click={copyToClipboard}
                                title={copied ? "Copied!" : "Copy to clipboard"}
                                class="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all hover:scale-110 active:scale-95 shadow-sm"
                            >
                                {#if copied}
                                    <svg
                                        class="w-4 h-4 text-green-600 dark:text-green-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M5 13l4 4L19 7"
                                        ></path>
                                    </svg>
                                {:else}
                                    <svg
                                        class="w-4 h-4 text-gray-600 dark:text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        ></path>
                                    </svg>
                                {/if}
                            </button>
                        </div>
                        <div
                            class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                        >
                            <!-- Use marked to parse markdown -->
                            {@html sanitize(analysisResult)}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes fade-in-up {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-fade-in-up {
        animation: fade-in-up 0.3s ease-out;
    }

    /* Custom Scrollbar */
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    /* Premium Markdown Styles */
    :global(.prose) {
        line-height: 1.8;
    }

    :global(.prose p) {
        margin-top: 1.25em;
        margin-bottom: 1.25em;
    }

    :global(.prose h1),
    :global(.prose h2),
    :global(.prose h3) {
        color: #7e22ce; /* purple-700 */
        font-weight: 700;
        margin-top: 2em;
        margin-bottom: 0.75em;
        line-height: 1.4;
    }
    :global(.dark .prose h1),
    :global(.dark .prose h2),
    :global(.dark .prose h3) {
        color: #d8b4fe; /* purple-300 */
    }

    /* Lists */
    :global(.prose ul),
    :global(.prose ol) {
        margin-top: 1.5em;
        margin-bottom: 1.5em;
        padding-left: 1.75em;
    }
    :global(.prose li) {
        margin-top: 0.5em;
        margin-bottom: 0.5em;
    }
    :global(.prose li > p) {
        margin-top: 0.75em;
        margin-bottom: 0.75em;
    }

    /* Table Styling */
    :global(.prose table) {
        width: 100%;
        margin-top: 2em;
        margin-bottom: 2em;
        border-collapse: collapse;
        border-radius: 0.75rem;
        overflow: hidden;
        background-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    }
    :global(.dark .prose table) {
        background-color: rgba(0, 0, 0, 0.2);
    }
    :global(.prose th) {
        background-color: #f3f4f6;
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: #4b5563;
        font-size: 0.9em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    :global(.dark .prose th) {
        background-color: #374151;
        color: #e5e7eb;
    }
    :global(.prose td) {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e5e7eb;
        color: #374151;
    }
    :global(.dark .prose td) {
        border-color: #374151;
        color: #d1d5db;
    }
    :global(.prose tr:last-child td) {
        border-bottom: none;
    }

    /* Strong/Bold */
    :global(.prose strong) {
        color: #6b21a8; /* purple-800 */
        font-weight: 600;
    }
    :global(.dark .prose strong) {
        color: #e9d5ff; /* purple-200 */
    }

    /* Code */
    :global(.prose code) {
        background-color: #f3f4f6;
        padding: 0.2em 0.4em;
        border-radius: 0.25rem;
        font-size: 0.875em;
    }
    :global(.dark .prose code) {
        background-color: #374151;
    }

    /* Blockquotes */
    :global(.prose blockquote) {
        border-left-color: #9333ea;
        background-color: #f5f3ff; /* purple-50 */
        padding: 1.25rem;
        border-radius: 0.5rem;
        font-style: normal;
        margin-top: 2em;
        margin-bottom: 2em;
    }
    :global(.dark .prose blockquote) {
        background-color: rgba(147, 51, 234, 0.1);
        border-left-color: #a855f7;
        color: #e5e7eb;
    }

    /* Horizontal rules */
    :global(.prose hr) {
        margin-top: 2.5em;
        margin-bottom: 2.5em;
        border-color: #e5e7eb;
    }
    :global(.dark .prose hr) {
        border-color: #374151;
    }
</style>
