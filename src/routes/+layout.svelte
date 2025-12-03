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
			<ThemeToggle />
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
