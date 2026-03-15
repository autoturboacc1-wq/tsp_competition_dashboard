<svelte:head>
    <title>Live Trade Schedule — EliteGold</title>
    <meta name="description" content="ตารางโค้ชเทรดสด EliteGold Community ครบทุกช่วงเวลา ตั้งแต่เช้าจนถึงดึก" />
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { coaches } from '$lib/coaches';

	function getBangkokTimeString(): string {
		const now = new Date();
		const h = Math.floor(((now.getUTCHours() + 7) % 24));
		const m = now.getUTCMinutes().toString().padStart(2, '0');
		return `${h.toString().padStart(2, '0')}:${m}`;
	}

	let tick = $state(0);
	// Map of youtube handle -> videoId for all currently live coaches
	let liveMap = $state<Map<string, string>>(new Map());
	let showPreview = $state(true);

	async function scanLive() {
		try {
			const testParam = new URLSearchParams(window.location.search).has('test') ? '?test' : '';
			const res = await fetch(`/api/live-scan${testParam}`);
			const data = await res.json();
			const newMap = new Map<string, string>();
			if (data.liveCoaches) {
				for (const lc of data.liveCoaches) {
					if (lc.videoId) newMap.set(lc.youtube, lc.videoId);
				}
			}
			liveMap = newMap;
		} catch {}
	}

	onMount(() => {
		const tickInterval = setInterval(() => tick++, 30000);
		scanLive();
		const scanInterval = setInterval(scanLive, 120_000);

		return () => {
			clearInterval(tickInterval);
			clearInterval(scanInterval);
		};
	});

	let currentTime = $derived.by(() => {
		void tick;
		return getBangkokTimeString();
	});

	let hasAnyLive = $derived(liveMap.size > 0);

	// Get live coaches with their index for embed display
	let liveCoachEntries = $derived.by(() => {
		const entries: { coach: typeof coaches[0]; index: number; videoId: string }[] = [];
		coaches.forEach((c, i) => {
			const vid = liveMap.get(c.youtube);
			if (vid) entries.push({ coach: c, index: i, videoId: vid });
		});
		return entries;
	});
</script>

<section class="min-h-screen bg-gray-50 dark:bg-dark-bg">
	<div class="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
					ELITE GOLD <span class="text-gold">LIVE TRADE</span>
				</h1>
				<p class="text-xs text-gray-500 mt-1">ตาราง Live Trade Master ประจำวัน</p>
			</div>
			<div class="flex items-center gap-3">
				{#if hasAnyLive}
					<div class="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5">
						<span class="relative flex h-2.5 w-2.5">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
						</span>
						<span class="text-xs text-green-600 dark:text-green-400 font-medium">LIVE</span>
					</div>
				{/if}
				<div class="rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border px-3 py-1.5 text-center">
					<div class="text-lg font-mono font-bold text-gray-900 dark:text-white tracking-wider">{currentTime}</div>
					<div class="text-[9px] text-gray-500 -mt-0.5">Bangkok Time</div>
				</div>
			</div>
		</div>

		<!-- Live Stream Previews (all live coaches) -->
		{#each liveCoachEntries as { coach, videoId }}
			<div
				class="rounded-2xl overflow-hidden border-2 {coach.colorBorder} live-preview"
				style="--glow-rgb: {coach.glow}"
			>
				<div class="flex items-center justify-between px-4 py-3 {coach.colorBg}">
					<div class="flex items-center gap-3">
						<img
							src={coach.avatar}
							alt={coach.name}
							class="w-8 h-8 rounded-full object-cover border-2 {coach.colorBorder}"
						/>
						<div>
							<div class="flex items-center gap-2">
								<span class="relative flex h-2 w-2">
									<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
									<span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
								</span>
								<span class="text-sm font-bold text-gray-900 dark:text-white">{coach.name}</span>
								<span class="text-xs {coach.colorText} font-medium">กำลัง LIVE</span>
							</div>
							<p class="text-[11px] text-gray-500 mt-0.5">{coach.channel}</p>
						</div>
					</div>
					<button
						onclick={() => showPreview = !showPreview}
						class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-dark-surface/50 transition-colors"
					>
						{showPreview ? 'ซ่อน' : 'ดูสด'}
					</button>
				</div>

				{#if showPreview}
					<div class="aspect-video bg-black">
						<iframe
							src="https://www.youtube.com/embed/{videoId}?autoplay=1&mute=1&rel=0"
							title="{coach.name} Live Stream"
							class="w-full h-full"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowfullscreen
						></iframe>
					</div>
				{/if}
			</div>
		{/each}

		<!-- Coach list -->
		<div class="space-y-3">
			{#each coaches as coach, i}
				{@const live = liveMap.has(coach.youtube)}
				{@const videoId = liveMap.get(coach.youtube)}
				<div
					class="live-card relative rounded-2xl border transition-all duration-500
						{live
							? `${coach.colorBorder} ${coach.colorBg}`
							: 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-border/30'}"
					style={live ? `--glow-rgb: ${coach.glow}` : ''}
					class:is-live={live}
				>
					{#if live}
						<div class="absolute -top-2.5 right-4">
							<span class="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
								<span class="relative flex h-1.5 w-1.5">
									<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
									<span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
								</span>
								Live
							</span>
						</div>
					{/if}

					<div class="flex items-center gap-4 p-4">
						<!-- Coach badge -->
						<div class="flex-shrink-0 w-28">
							<div class="rounded-xl bg-gradient-to-r {coach.color} px-3 py-2 text-center">
								<div class="text-[10px] font-bold text-white tracking-wider">{coach.name}</div>
								<div class="text-[10px] text-white/80">{coach.time}</div>
							</div>
						</div>

						<!-- Avatar -->
						<div class="flex-shrink-0 relative">
							{#if live}
								<div class="absolute -inset-1 rounded-full animate-pulse-ring" style="background: rgba({coach.glow}, 0.25)"></div>
							{/if}
							<img
								src={coach.avatar}
								alt={coach.name}
								class="relative w-11 h-11 rounded-full object-cover border-2 transition-all duration-500
									{live ? coach.colorBorder : 'border-gray-200 dark:border-dark-border'}"
							/>
						</div>

						<!-- Channel info -->
						<div class="flex-1 min-w-0">
							<h3 class="text-sm font-semibold truncate transition-colors duration-500 {live ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}">{coach.channel}</h3>
							{#if live && videoId}
								<button
									onclick={() => { showPreview = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
									class="inline-flex items-center gap-1.5 mt-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-1 text-[11px] text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors font-medium"
								>
									<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
										<path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
									</svg>
									ดูสด
								</button>
							{:else}
								<a
									href="https://www.youtube.com/{coach.youtube}"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1.5 mt-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] text-red-500 dark:text-red-400 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-300 transition-colors"
								>
									<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
										<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
									</svg>
									{coach.youtube}
								</a>
							{/if}
						</div>

						<!-- Time display -->
						<div class="flex-shrink-0 text-right hidden sm:block">
							<div class="text-sm font-mono transition-colors duration-500 {live ? coach.colorText : 'text-gray-400 dark:text-gray-500'}">
								{coach.time}
							</div>
							{#if live}
								<div class="text-[10px] {coach.colorText} mt-0.5 font-medium">กำลัง Live</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Discord CTA -->
		<div class="text-center pt-4">
			<a
				href="https://discord.gg/StPwKKPPTj"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-lg transition-all shadow-lg shadow-[#5865F2]/30"
			>
				<svg class="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path fill-rule="evenodd" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.48 13.48 0 0 0-1.726 3.553 18.046 18.046 0 0 0-8.82 0 13.483 13.483 0 0 0-1.727-3.553.074.074 0 0 0-.079-.037 19.791 19.791 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" clip-rule="evenodd" />
				</svg>
				เข้า Discord ดูสด
			</a>
		</div>
	</div>
</section>

<style>
	.live-card.is-live {
		animation: card-glow 2.5s ease-in-out infinite;
	}

	.live-preview {
		animation: preview-glow 3s ease-in-out infinite;
	}

	@keyframes card-glow {
		0%, 100% {
			box-shadow:
				0 0 8px 0 rgba(var(--glow-rgb), 0.15),
				0 0 20px -4px rgba(var(--glow-rgb), 0.1);
		}
		50% {
			box-shadow:
				0 0 16px 2px rgba(var(--glow-rgb), 0.3),
				0 0 40px -4px rgba(var(--glow-rgb), 0.2);
		}
	}

	@keyframes preview-glow {
		0%, 100% {
			box-shadow:
				0 0 12px 0 rgba(var(--glow-rgb), 0.2),
				0 0 30px -4px rgba(var(--glow-rgb), 0.15);
		}
		50% {
			box-shadow:
				0 0 24px 4px rgba(var(--glow-rgb), 0.4),
				0 0 60px -4px rgba(var(--glow-rgb), 0.25);
		}
	}

	.animate-pulse-ring {
		animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse-ring {
		0%, 100% { opacity: 0.5; transform: scale(1); }
		50%      { opacity: 0;   transform: scale(1.35); }
	}
</style>
