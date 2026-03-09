<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import { supabase } from '$lib/supabaseClient';
    import { feedItems, type FeedItem } from '$lib/stores/feedStore';
    import FeedCard from '$lib/components/FeedCard.svelte';

    let nicknames = new Map<string, string>();
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    // Filters
    let filterType: 'all' | 'opened' | 'closed' | 'profit' | 'loss' = 'all';
    let filterTrader = '';

    // Sound
    let soundEnabled = browser ? localStorage.getItem('feedSound') !== 'off' : true;

    // Auto-scroll
    let userScrolledUp = false;
    let newCount = 0;
    let feedContainer: HTMLElement;

    const filters = [
        { key: 'all', label: 'All' },
        { key: 'opened', label: 'Opened' },
        { key: 'closed', label: 'Closed' },
        { key: 'profit', label: 'Profit' },
        { key: 'loss', label: 'Loss' },
    ] as const;

    $: filteredItems = $feedItems.filter(item => {
        if (filterType === 'opened' && item.type !== 'trade_opened') return false;
        if (filterType === 'closed' && item.type !== 'trade_closed') return false;
        if (filterType === 'profit' && !(item.type === 'trade_closed' && item.profit !== undefined && item.profit >= 0)) return false;
        if (filterType === 'loss' && !(item.type === 'trade_closed' && item.profit !== undefined && item.profit < 0)) return false;
        if (filterTrader && item.participantId !== filterTrader) return false;
        return true;
    });

    $: traders = [...new Map($feedItems.map(i => [i.participantId, i.nickname])).entries()];

    function toggleSound() {
        soundEnabled = !soundEnabled;
        if (browser) localStorage.setItem('feedSound', soundEnabled ? 'on' : 'off');
    }

    function playNotification() {
        if (!soundEnabled || !browser) return;
        try {
            const audio = new Audio('/sounds/notify.wav');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch {}
    }

    function handleScroll() {
        if (!feedContainer) return;
        userScrolledUp = feedContainer.scrollTop > 100;
        if (!userScrolledUp) newCount = 0;
    }

    function scrollToTop() {
        feedContainer?.scrollTo({ top: 0, behavior: 'smooth' });
        newCount = 0;
        userScrolledUp = false;
    }

    function mapTradeToFeedItem(trade: any, type: 'trade_opened' | 'trade_closed'): FeedItem {
        return {
            id: trade.position_id || trade.id,
            type,
            participantId: trade.participant_id,
            nickname: nicknames.get(trade.participant_id) || 'Unknown',
            symbol: trade.symbol || 'XAUUSD',
            tradeType: trade.type === 'BUY' || trade.type === 0 ? 'BUY' : 'SELL',
            lot: trade.lot || 0,
            profit: type === 'trade_closed' ? trade.profit : undefined,
            timestamp: type === 'trade_closed' ? trade.close_time : trade.open_time,
        };
    }

    async function loadInitialData() {
        // Load participants for nickname resolution
        const { data: participants } = await supabase
            .from('participants')
            .select('id, nickname');

        if (participants) {
            for (const p of participants) {
                nicknames.set(p.id, p.nickname);
            }
        }

        // Load recent trades
        const { data: trades } = await supabase
            .from('trades')
            .select('*')
            .not('close_time', 'is', null)
            .order('close_time', { ascending: false })
            .limit(50);

        if (trades && trades.length > 0) {
            const items: FeedItem[] = trades.map(t => mapTradeToFeedItem(t, 'trade_closed'));
            feedItems.seed(items);
        }
    }

    function setupRealtime() {
        realtimeChannel = supabase
            .channel('feed-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades' }, (payload) => {
                const trade = payload.new;
                const type = trade.close_time ? 'trade_closed' : 'trade_opened';
                const item = mapTradeToFeedItem(trade, type);
                feedItems.addItem(item);
                playNotification();
                if (userScrolledUp) newCount++;
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trades' }, (payload) => {
                const trade = payload.new;
                if (trade.close_time) {
                    const item = mapTradeToFeedItem(trade, 'trade_closed');
                    feedItems.addItem(item);
                    playNotification();
                    if (userScrolledUp) newCount++;
                }
            })
            .subscribe();
    }

    onMount(async () => {
        await loadInitialData();
        setupRealtime();
    });

    onDestroy(() => {
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    });
</script>

<svelte:head>
    <title>Live Feed - EliteGold</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold dark:text-white">Live Feed</h1>
            <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
        </div>
        <button
            on:click={toggleSound}
            class="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
        >
            {#if soundEnabled}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            {/if}
        </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {#each filters as f}
            <button
                on:click={() => filterType = f.key}
                class="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
                    {filterType === f.key
                        ? 'bg-gold text-black'
                        : 'bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
            >
                {f.label}
            </button>
        {/each}

        {#if traders.length > 0}
            <select
                bind:value={filterTrader}
                class="shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-gray-400 border-none outline-none cursor-pointer"
            >
                <option value="">All Traders</option>
                {#each traders as [id, name]}
                    <option value={id}>{name}</option>
                {/each}
            </select>
        {/if}
    </div>

    <!-- New events pill -->
    {#if userScrolledUp && newCount > 0}
        <button
            on:click={scrollToTop}
            class="w-full mb-3 py-2 rounded-lg bg-gold/90 text-black text-sm font-medium hover:bg-gold transition-colors animate-fade-in-up"
        >
            {newCount} new {newCount === 1 ? 'event' : 'events'} — tap to see
        </button>
    {/if}

    <!-- Feed -->
    <div
        bind:this={feedContainer}
        on:scroll={handleScroll}
        class="space-y-2 max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide"
    >
        {#each filteredItems as item (item.id + '-' + item.type)}
            <FeedCard {item} />
        {/each}

        {#if filteredItems.length === 0}
            <div class="text-center py-16 text-gray-400 dark:text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <p class="text-sm">No activity yet</p>
                <p class="text-xs mt-1">Trades will appear here in real-time</p>
            </div>
        {/if}
    </div>
</div>
