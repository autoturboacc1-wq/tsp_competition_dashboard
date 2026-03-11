const VAPID_PUBLIC_KEY_STORAGE = 'push-vapid-public-key';

export async function isPushSupported(): Promise<boolean> {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    return await Notification.requestPermission();
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    try {
        const registration = await navigator.serviceWorker.ready;

        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) return existingSub;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer
        });

        return subscription;
    } catch (err) {
        console.error('Push subscription failed:', err);
        return null;
    }
}

export async function unsubscribeFromPush(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            return await subscription.unsubscribe();
        }
        return true;
    } catch {
        return false;
    }
}

export async function saveSubscription(
    subscription: PushSubscription,
    participantId?: string
): Promise<boolean> {
    try {
        const response = await fetch('/api/push-subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                participant_id: participantId
            })
        });
        return response.ok;
    } catch {
        return false;
    }
}

export async function removeSubscription(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return true;

        const response = await fetch('/api/push-subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: subscription.endpoint
            })
        });
        return response.ok;
    } catch {
        return false;
    }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
