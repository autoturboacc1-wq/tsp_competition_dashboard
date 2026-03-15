<script lang="ts">
    import type { PageData } from './$types';
    import { invalidateAll } from '$app/navigation';
    import { onMount } from 'svelte';

    export let data: PageData;

    $: ({ participants, syncInfo } = data);

    // Simple admin password gate (client-side only, not secure - for basic access control)
    let isAuthenticated = false;
    let passwordInput = '';
    const ADMIN_KEY = 'elitegold2024';

    function authenticate() {
        if (passwordInput === ADMIN_KEY) {
            isAuthenticated = true;
            fetchLiveStatus();
        }
    }

    // ── Live Control ──
    const coachOptions = [
        { name: 'COACH PING', youtube: '@goldwithping' },
        { name: 'COACH BALL', youtube: '@trader10-x' },
        { name: 'COACH PU', youtube: '@PuMoneyMind' },
        { name: 'COACH CZECH', youtube: '@alltimehigh.official' },
        { name: 'COACH FUTURE', youtube: '@tradethefuturebyfuture' },
        { name: 'COACH JHEE', youtube: '@jheearoonwan' },
        { name: 'COACH ICZ', youtube: '@portgoldtrader' },
        { name: 'COACH DUK', youtube: '@Pidfah' },
        { name: 'COACH MAY', youtube: '@MC.Maydaychannel' }
    ];

    let selectedCoachYoutube = '';
    let videoIdInput = '';
    let currentLiveCoach: string | null = null;
    let currentLiveYoutube: string | null = null;
    let currentVideoId: string | null = null;
    let settingLive = false;
    let liveError = '';

    function extractVideoId(input: string): string {
        if (!input) return '';
        const trimmed = input.trim();
        if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
        const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
        return match ? match[1] : trimmed;
    }

    async function fetchLiveStatus() {
        try {
            const res = await fetch('/api/admin/live-status');
            const data = await res.json();
            currentLiveYoutube = data.coach_youtube || null;
            currentVideoId = data.video_id || null;
            currentLiveCoach = currentLiveYoutube
                ? coachOptions.find(c => c.youtube === currentLiveYoutube)?.name || null
                : null;
        } catch {}
    }

    async function setLive() {
        if (!selectedCoachYoutube) return;
        settingLive = true;
        liveError = '';
        try {
            const res = await fetch('/api/admin/live-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coach_youtube: selectedCoachYoutube,
                    video_id: extractVideoId(videoIdInput)
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to set live');
            }
            await fetchLiveStatus();
            selectedCoachYoutube = '';
            videoIdInput = '';
        } catch (e: any) {
            liveError = e.message;
        } finally {
            settingLive = false;
        }
    }

    async function stopLive() {
        settingLive = true;
        liveError = '';
        try {
            const res = await fetch('/api/admin/live-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coach_youtube: null, video_id: null })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to stop live');
            }
            await fetchLiveStatus();
        } catch (e: any) {
            liveError = e.message;
        } finally {
            settingLive = false;
        }
    }

    // Edit participant modal
    let editingParticipant: any = null;
    let editNickname = '';
    let editAccountId = '';
    let editServer = '';
    let editPassword = '';
    let saving = false;
    let saveError = '';

    function openEdit(p: any) {
        editingParticipant = p;
        editNickname = p.nickname;
        editAccountId = p.account_id || '';
        editServer = p.server || '';
        editPassword = '';
        saveError = '';
    }

    function closeEdit() {
        editingParticipant = null;
        saveError = '';
    }

    async function saveParticipant() {
        if (!editingParticipant) return;
        saving = true;
        saveError = '';

        try {
            const res = await fetch('/api/admin/participant', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingParticipant.id,
                    nickname: editNickname,
                    account_id: editAccountId,
                    server: editServer,
                    investor_password: editPassword || undefined
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }

            closeEdit();
            await invalidateAll();
        } catch (e: any) {
            saveError = e.message;
        } finally {
            saving = false;
        }
    }

    // Add participant
    let showAdd = false;
    let newNickname = '';
    let newAccountId = '';
    let newServer = '';
    let newPassword = '';
    let adding = false;
    let addError = '';

    async function addParticipant() {
        if (!newNickname || !newAccountId) {
            addError = 'Nickname and Account ID are required';
            return;
        }
        adding = true;
        addError = '';

        try {
            const res = await fetch('/api/admin/participant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nickname: newNickname,
                    account_id: newAccountId,
                    server: newServer,
                    investor_password: newPassword
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to add');
            }

            showAdd = false;
            newNickname = '';
            newAccountId = '';
            newServer = '';
            newPassword = '';
            await invalidateAll();
        } catch (e: any) {
            addError = e.message;
        } finally {
            adding = false;
        }
    }

    function formatDate(dateStr: string | null): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    }

    function timeSince(dateStr: string | null): string {
        if (!dateStr) return 'Never';
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
</script>

<svelte:head>
    <title>Admin | EliteGold</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">

        {#if !isAuthenticated}
            <!-- Login Gate -->
            <div class="max-w-sm mx-auto mt-20">
                <div class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border">
                    <h1 class="text-xl font-bold dark:text-white mb-4">Admin Access</h1>
                    <form on:submit|preventDefault={authenticate}>
                        <input
                            type="password"
                            bind:value={passwordInput}
                            placeholder="Enter admin password"
                            class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <button
                            type="submit"
                            class="mt-3 w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        {:else}
            <!-- Admin Dashboard -->
            <div class="mb-6 flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold dark:text-white">Admin Panel</h1>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Manage participants and monitor sync status</p>
                </div>
                <a href="/" class="text-sm text-blue-600 hover:text-blue-500">&larr; Back to Dashboard</a>
            </div>

            <!-- Live Control -->
            <div class="mb-6 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border p-5">
                <div class="flex items-center gap-3 mb-4">
                    <h2 class="font-semibold dark:text-white">Live Control</h2>
                    {#if currentLiveCoach}
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs text-green-600 dark:text-green-400 font-medium">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            ON AIR
                        </span>
                    {:else}
                        <span class="text-xs text-gray-400 bg-gray-100 dark:bg-dark-border px-2.5 py-0.5 rounded-full">OFF AIR</span>
                    {/if}
                </div>

                {#if currentLiveCoach}
                    <div class="mb-4 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <p class="text-sm dark:text-white">
                            <span class="font-semibold">{currentLiveCoach}</span> กำลัง Live อยู่
                        </p>
                        {#if currentVideoId}
                            <p class="text-xs text-gray-400 mt-1">Video ID: {currentVideoId}</p>
                        {/if}
                    </div>
                {/if}

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="live-coach" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">เลือกโค้ช</label>
                        <select id="live-coach" bind:value={selectedCoachYoutube} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm">
                            <option value="">-- เลือกโค้ช --</option>
                            {#each coachOptions as coach}
                                <option value={coach.youtube}>{coach.name}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="live-video" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">YouTube Video ID หรือ URL</label>
                        <input id="live-video" bind:value={videoIdInput} placeholder="เช่น dQw4w9WgXcQ หรือ youtube.com/watch?v=..." class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm" />
                    </div>
                </div>

                {#if liveError}
                    <p class="mt-3 text-xs text-red-500">{liveError}</p>
                {/if}

                <div class="flex gap-3 mt-4">
                    <button
                        on:click={setLive}
                        disabled={!selectedCoachYoutube || settingLive}
                        class="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 transition-colors"
                    >
                        {settingLive ? 'Setting...' : 'Set Live'}
                    </button>
                    <button
                        on:click={stopLive}
                        disabled={!currentLiveCoach || settingLive}
                        class="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 transition-colors"
                    >
                        Stop Live
                    </button>
                </div>
            </div>

            <!-- Sync Status Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div class="p-4 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Participants</div>
                    <div class="text-2xl font-bold dark:text-white">{syncInfo.totalParticipants}</div>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Sync Days</div>
                    <div class="text-2xl font-bold dark:text-white">{syncInfo.totalSyncDays}</div>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Stats Sync</div>
                    <div class="text-lg font-bold dark:text-white">{syncInfo.lastSyncDate || '-'}</div>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Snapshot</div>
                    <div class="text-lg font-bold dark:text-white">{timeSince(syncInfo.lastSnapshotTime)}</div>
                </div>
            </div>

            <!-- Participants Table -->
            <div class="rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border overflow-hidden">
                <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
                    <h2 class="font-semibold dark:text-white">Participants</h2>
                    <button
                        on:click={() => { showAdd = true; addError = ''; }}
                        class="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                        + Add Participant
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-dark-bg/50">
                            <tr>
                                <th class="px-4 py-3 text-left">Nickname</th>
                                <th class="px-4 py-3 text-left">Account ID</th>
                                <th class="px-4 py-3 text-left">Server</th>
                                <th class="px-4 py-3 text-right">Balance</th>
                                <th class="px-4 py-3 text-right">Profit</th>
                                <th class="px-4 py-3 text-right">Trades</th>
                                <th class="px-4 py-3 text-right">Win Rate</th>
                                <th class="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-dark-border">
                            {#each participants as p}
                                <tr class="hover:bg-gray-50 dark:hover:bg-dark-border/20">
                                    <td class="px-4 py-3 font-medium dark:text-white">
                                        <a href="/leaderboard/{p.id}" class="hover:text-amber-500">{p.nickname}</a>
                                    </td>
                                    <td class="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.account_id || '-'}</td>
                                    <td class="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{p.server || '-'}</td>
                                    <td class="px-4 py-3 text-right font-mono dark:text-gray-300">
                                        {p.latestStats?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}
                                    </td>
                                    <td class="px-4 py-3 text-right font-mono {(p.latestStats?.profit ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                        {p.latestStats?.profit != null ? (p.latestStats.profit >= 0 ? '+' : '') + p.latestStats.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td class="px-4 py-3 text-right dark:text-gray-300">{p.latestStats?.total_trades ?? '-'}</td>
                                    <td class="px-4 py-3 text-right dark:text-gray-300">{p.latestStats?.win_rate != null ? `${p.latestStats.win_rate.toFixed(1)}%` : '-'}</td>
                                    <td class="px-4 py-3 text-center">
                                        <button
                                            on:click={() => openEdit(p)}
                                            class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                            {#if participants.length === 0}
                                <tr>
                                    <td colspan="8" class="px-4 py-8 text-center text-gray-400">No participants found</td>
                                </tr>
                            {/if}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}
    </div>
</div>

<!-- Edit Modal -->
{#if editingParticipant}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" on:click|self={closeEdit}>
        <div class="bg-white dark:bg-dark-surface rounded-xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-dark-border shadow-xl">
            <h3 class="text-lg font-bold dark:text-white mb-4">Edit Participant</h3>

            <div class="space-y-3">
                <div>
                    <label for="edit-nickname" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nickname</label>
                    <input id="edit-nickname" bind:value={editNickname} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                    <label for="edit-account-id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Account ID</label>
                    <input id="edit-account-id" bind:value={editAccountId} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm font-mono" />
                </div>
                <div>
                    <label for="edit-server" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Server</label>
                    <input id="edit-server" bind:value={editServer} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                    <label for="edit-investor-password" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Investor Password (leave blank to keep current)</label>
                    <input id="edit-investor-password" type="password" bind:value={editPassword} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm" />
                </div>
            </div>

            {#if saveError}
                <p class="mt-3 text-xs text-red-500">{saveError}</p>
            {/if}

            <div class="flex gap-3 mt-5">
                <button on:click={closeEdit} class="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border/30">
                    Cancel
                </button>
                <button on:click={saveParticipant} disabled={saving} class="flex-1 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Add Modal -->
{#if showAdd}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" on:click|self={() => showAdd = false}>
        <div class="bg-white dark:bg-dark-surface rounded-xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-dark-border shadow-xl">
            <h3 class="text-lg font-bold dark:text-white mb-4">Add Participant</h3>

            <div class="space-y-3">
                <div>
                    <label for="new-nickname" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nickname *</label>
                    <input id="new-nickname" bind:value={newNickname} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                    <label for="new-account-id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Account ID *</label>
                    <input id="new-account-id" bind:value={newAccountId} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm font-mono" />
                </div>
                <div>
                    <label for="new-server" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Server</label>
                    <input id="new-server" bind:value={newServer} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                    <label for="new-investor-password" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Investor Password</label>
                    <input id="new-investor-password" type="password" bind:value={newPassword} class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-sm" />
                </div>
            </div>

            {#if addError}
                <p class="mt-3 text-xs text-red-500">{addError}</p>
            {/if}

            <div class="flex gap-3 mt-5">
                <button on:click={() => showAdd = false} class="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border/30">
                    Cancel
                </button>
                <button on:click={addParticipant} disabled={adding} class="flex-1 px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50">
                    {adding ? 'Adding...' : 'Add'}
                </button>
            </div>
        </div>
    </div>
{/if}
