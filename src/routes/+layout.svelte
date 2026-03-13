<script>
	import "../app.css";
	import { browser, dev } from "$app/environment";
	import { onMount } from "svelte";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import { page } from "$app/stores";

	$: pathname = $page.url.pathname;

	onMount(() => {
		if (!browser || !dev || !("serviceWorker" in navigator)) return;

		const resetKey = "tsp-dev-sw-reset";

		void (async () => {
			const registrations = await navigator.serviceWorker.getRegistrations();
			if (registrations.length === 0) return;

			await Promise.allSettled(registrations.map((registration) => registration.unregister()));

			if ("caches" in window) {
				const cacheKeys = await caches.keys();
				await Promise.allSettled(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
			}

			if (navigator.serviceWorker.controller && !sessionStorage.getItem(resetKey)) {
				sessionStorage.setItem(resetKey, "1");
				location.reload();
				return;
			}

			sessionStorage.removeItem(resetKey);
		})().catch((error) => {
			console.warn("Failed to clear dev service workers", error);
		});
	});
</script>

<div
	class="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white transition-colors duration-300"
>
	<header
		class="bg-white dark:bg-dark-surface/80 dark:backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-dark-border sticky top-0 z-50 pt-[env(safe-area-inset-top)]"
	>
		<div
			class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
		>
			<a
				href="/"
				class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
			>
				<img src="/logo.png" alt="EliteGold Logo" class="h-8 w-auto" />
				<span>Elite<span class="text-gold">Gold</span></span>
			</a>
			<nav class="hidden sm:flex items-center gap-6 ml-8">
				<a href="/" class="text-sm font-medium {pathname === '/' ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'} transition-colors">Home</a>
				<a href="/dashboard" class="text-sm font-medium {pathname === '/dashboard' ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'} transition-colors">Dashboard</a>
				<a href="/feed" class="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-1.5">
					Live
					<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
				</a>
				<a href="/leaderboard" class="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Leaderboard</a>
				<a href="/rules" class="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Rules</a>
				<a href="/history" class="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">History</a>
			</nav>
			<div class="flex items-center gap-4">
				<a
					href="https://discord.gg/StPwKKPPTj"
					target="_blank"
					rel="noopener noreferrer"
					class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
				>
					<span class="sr-only">Discord</span>
					<svg
						class="h-6 w-6"
						fill="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.48 13.48 0 0 0-1.726 3.553 18.046 18.046 0 0 0-8.82 0 13.483 13.483 0 0 0-1.727-3.553.074.074 0 0 0-.079-.037 19.791 19.791 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"
							clip-rule="evenodd"
						/>
					</svg>
				</a>
				<ThemeToggle />
			</div>
		</div>
	</header>

	<main class="pb-16 sm:pb-0">
		<slot />
	</main>

	<!-- Mobile Bottom Navigation -->
	<nav class="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border sm:hidden pb-[env(safe-area-inset-bottom)]">
		<div class="grid grid-cols-5 h-14">
			<a href="/dashboard" class="flex flex-col items-center justify-center gap-0.5 transition-colors {pathname === '/dashboard' ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 dark:text-gray-500'}">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>
				<span class="text-[10px] font-semibold">Home</span>
			</a>
			<a href="/feed" class="flex flex-col items-center justify-center gap-0.5 transition-colors {pathname === '/feed' ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 dark:text-gray-500'}">
				<span class="relative">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
					<span class="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>
				</span>
				<span class="text-[10px] font-semibold">Live</span>
			</a>
			<a href="/leaderboard" class="flex flex-col items-center justify-center gap-0.5 transition-colors {pathname.startsWith('/leaderboard') ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 dark:text-gray-500'}">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
				<span class="text-[10px] font-semibold">Ranking</span>
			</a>
			<a href="/rules" class="flex flex-col items-center justify-center gap-0.5 transition-colors {pathname === '/rules' ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 dark:text-gray-500'}">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
				<span class="text-[10px] font-semibold">Rules</span>
			</a>
			<a href="/history" class="flex flex-col items-center justify-center gap-0.5 transition-colors {pathname === '/history' ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 dark:text-gray-500'}">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				<span class="text-[10px] font-semibold">History</span>
			</a>
		</div>
	</nav>

	<footer
		class="bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border mt-auto"
	>
		<div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
			<p class="text-center text-sm text-gray-500 dark:text-gray-300">
				&copy; {new Date().getFullYear()} EliteGold Competition. All rights
				reserved.
			</p>
		</div>
	</footer>
</div>
