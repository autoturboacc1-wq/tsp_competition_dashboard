<script lang="ts">
    import { onMount } from 'svelte';
    import {
        isPushSupported,
        getPushPermission,
        requestPushPermission,
        subscribeToPush,
        unsubscribeFromPush,
        saveSubscription,
        removeSubscription
    } from '$lib/pushNotifications';

    export let vapidPublicKey: string = '';

    let supported = false;
    let permission: NotificationPermission = 'default';
    let subscribed = false;
    let loading = false;
    let error = '';

    onMount(async () => {
        supported = await isPushSupported();
        if (supported) {
            permission = await getPushPermission();
            if (permission === 'granted') {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                subscribed = !!sub;
            }
        }
    });

    async function togglePush() {
        loading = true;
        error = '';

        try {
            if (subscribed) {
                await removeSubscription();
                await unsubscribeFromPush();
                subscribed = false;
            } else {
                permission = await requestPushPermission();
                if (permission !== 'granted') {
                    error = 'Notification permission denied';
                    loading = false;
                    return;
                }

                if (!vapidPublicKey) {
                    error = 'Push notifications not configured';
                    loading = false;
                    return;
                }

                const subscription = await subscribeToPush(vapidPublicKey);
                if (subscription) {
                    await saveSubscription(subscription);
                    subscribed = true;
                } else {
                    error = 'Failed to subscribe';
                }
            }
        } catch (e) {
            error = 'Something went wrong';
            console.error(e);
        }

        loading = false;
    }
</script>

{#if supported}
    <div class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 card-hover">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {subscribed ? 'Receiving rank changes & big trades' : 'Get notified of rank changes'}
                </p>
            </div>
            <button
                on:click={togglePush}
                disabled={loading || permission === 'denied'}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-dark-bg disabled:opacity-50
                    {subscribed ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}"
            >
                <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        {subscribed ? 'translate-x-6' : 'translate-x-1'}"
                />
            </button>
        </div>
        {#if error}
            <p class="text-xs text-red-500 mt-2">{error}</p>
        {/if}
        {#if permission === 'denied'}
            <p class="text-xs text-amber-500 mt-2">Notifications blocked in browser settings</p>
        {/if}
    </div>
{/if}
