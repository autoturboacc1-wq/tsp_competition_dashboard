<script>
	import "../app.css";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
</script>

<div
	class="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white transition-colors duration-300"
>
	<header
		class="bg-white dark:bg-dark-surface/80 dark:backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-dark-border sticky top-0 z-50"
	>
		<div
			class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
		>
			<a
				href="/"
				class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
			>
				<img src="/logo.png" alt="Elite Gold Logo" class="h-8 w-auto" />
				<span>Elite Gold</span>
			</a>
			<div class="flex items-center gap-4">
				<a
					href="https://discord.gg/AyD3q3gQ"
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

	<main>
		<slot />
	</main>

	<footer
		class="bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border mt-auto"
	>
		<div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
			<p class="text-center text-sm text-gray-500 dark:text-gray-300">
				&copy; {new Date().getFullYear()} Elite Gold Competition. All rights
				reserved.
			</p>
		</div>
	</footer>
</div>
