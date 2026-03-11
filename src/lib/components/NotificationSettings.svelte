<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    export let participants: Array<{ id: string; nickname: string }> = [];
    export let botUsername: string = '';

    type Step = 'select' | 'input' | 'linked';

    let step: Step = 'select';
    let selectedParticipant = '';
    let chatIdInput = '';
    let loading = false;
    let error = '';
    let linkedName = '';
    let showHelp = false;

    // Remember last linked participant
    const STORAGE_KEY = 'telegram-linked-participant';

    onMount(async () => {
        if (!browser) return;
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
            selectedParticipant = savedId;
            // Check if still linked
            try {
                const res = await fetch(`/api/telegram-link?participant_id=${savedId}`);
                const data = await res.json();
                if (data.linked) {
                    step = 'linked';
                    linkedName = participants.find(p => p.id === savedId)?.nickname || 'Trader';
                }
            } catch {
                // Ignore, show default state
            }
        }
    });

    async function handleLink() {
        if (!selectedParticipant || !chatIdInput.trim()) {
            error = 'กรุณากรอก Chat ID';
            return;
        }

        loading = true;
        error = '';

        try {
            const res = await fetch('/api/telegram-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participant_id: selectedParticipant,
                    chat_id: chatIdInput.trim()
                })
            });

            const data = await res.json();

            if (!res.ok) {
                error = data.error || 'เชื่อมต่อไม่สำเร็จ';
                loading = false;
                return;
            }

            step = 'linked';
            linkedName = participants.find(p => p.id === selectedParticipant)?.nickname || 'Trader';
            if (browser) localStorage.setItem(STORAGE_KEY, selectedParticipant);
        } catch {
            error = 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
        }

        loading = false;
    }

    async function handleUnlink() {
        loading = true;
        error = '';

        try {
            await fetch('/api/telegram-link', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participant_id: selectedParticipant })
            });

            step = 'select';
            selectedParticipant = '';
            chatIdInput = '';
            linkedName = '';
            if (browser) localStorage.removeItem(STORAGE_KEY);
        } catch {
            error = 'ยกเลิกไม่สำเร็จ';
        }

        loading = false;
    }

    function goToInput() {
        if (!selectedParticipant) {
            error = 'เลือกชื่อของคุณก่อน';
            return;
        }
        error = '';
        step = 'input';
    }
</script>

<div class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 card-hover">
    {#if step === 'linked'}
        <!-- Linked state -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Telegram Alerts</h3>
                    <p class="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        {linkedName} — เชื่อมต่อแล้ว
                    </p>
                </div>
            </div>
            <button
                on:click={handleUnlink}
                disabled={loading}
                class="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
                ยกเลิก
            </button>
        </div>

    {:else if step === 'input'}
        <!-- Chat ID input -->
        <div class="space-y-3">
            <div class="flex items-center gap-2">
                <button on:click={() => { step = 'select'; error = ''; }} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">เชื่อมต่อ Telegram</h3>
            </div>

            <div class="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
                <p class="font-medium">วิธีหา Chat ID:</p>
                <ol class="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-400">
                    {#if botUsername}
                        <li>เปิด Telegram แล้วค้นหา <a href="https://t.me/{botUsername}" target="_blank" class="font-semibold underline">@{botUsername}</a></li>
                        <li>กด <b>Start</b> หรือส่งข้อความอะไรก็ได้ให้ Bot</li>
                    {:else}
                        <li>เปิด Telegram แล้วส่งข้อความให้ Bot ของการแข่ง</li>
                    {/if}
                    <li>ค้นหา <a href="https://t.me/userinfobot" target="_blank" class="font-semibold underline">@userinfobot</a> แล้วกด Start</li>
                    <li>จะได้ <b>Id</b> ตัวเลข — คัดลอกมาวางด้านล่าง</li>
                </ol>
            </div>

            <input
                type="text"
                bind:value={chatIdInput}
                placeholder="วาง Chat ID ที่นี่ เช่น 123456789"
                class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />

            {#if error}
                <p class="text-xs text-red-500">{error}</p>
            {/if}

            <button
                on:click={handleLink}
                disabled={loading || !chatIdInput.trim()}
                class="w-full py-2 rounded-lg text-sm font-medium text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ'}
            </button>
        </div>

    {:else}
        <!-- Select participant -->
        <div class="space-y-3">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
                    </svg>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Telegram Alerts</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">รับแจ้งเตือนส่วนตัวผ่าน Telegram</p>
                </div>
            </div>

            {#if participants.length > 0}
                <select
                    bind:value={selectedParticipant}
                    class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                    <option value="">เลือกชื่อของคุณ</option>
                    {#each participants as p}
                        <option value={p.id}>{p.nickname}</option>
                    {/each}
                </select>

                {#if error}
                    <p class="text-xs text-red-500">{error}</p>
                {/if}

                <button
                    on:click={goToInput}
                    disabled={!selectedParticipant}
                    class="w-full py-2 rounded-lg text-sm font-medium text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ถัดไป
                </button>
            {:else}
                <p class="text-xs text-gray-400 dark:text-gray-500">ยังไม่มีผู้เข้าร่วม</p>
            {/if}
        </div>
    {/if}
</div>
