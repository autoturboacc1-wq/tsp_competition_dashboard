<svelte:head>
    <title>Rules & Scoring | EliteGold</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto">
        <div class="mb-8 animate-fade-in-down">
            <h1 class="text-3xl font-bold dark:text-white">
                Competition <span class="text-gold">Rules</span>
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                How the EliteGold Competition works and how scores are calculated.
            </p>
        </div>

        <div class="space-y-6">
            <!-- Scoring System -->
            <section class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl">
                        &#x1F3C6;
                    </div>
                    <h2 class="text-xl font-bold dark:text-white">Points System</h2>
                </div>
                <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <p>Points are calculated based on multiple performance factors:</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border">
                            <div class="font-semibold dark:text-white">Net Profit</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Total realized P/L from closed trades</div>
                        </div>
                        <div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border">
                            <div class="font-semibold dark:text-white">Win Rate</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Percentage of profitable trades</div>
                        </div>
                        <div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border">
                            <div class="font-semibold dark:text-white">Profit Factor</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Ratio of gross profit to gross loss</div>
                        </div>
                        <div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border">
                            <div class="font-semibold dark:text-white">Risk Management</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Max drawdown penalty applied</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Competition Rules -->
            <section class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">
                        &#x1F4CB;
                    </div>
                    <h2 class="text-xl font-bold dark:text-white">General Rules</h2>
                </div>
                <ol class="space-y-3 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
                    <li>All participants must trade on their registered MT5 account only.</li>
                    <li>Trading instruments allowed: Forex, Gold (XAUUSD), Indices.</li>
                    <li>No use of arbitrage, HFT bots, or exploit-based strategies.</li>
                    <li>Each participant starts with the same initial balance.</li>
                    <li>Data is synced automatically from MT5 every 60 seconds.</li>
                    <li>Rankings are updated in real-time based on points calculation.</li>
                    <li>Rank changes are shown daily (compared to previous day's ranking).</li>
                </ol>
            </section>

            <!-- Trading Sessions -->
            <section class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl">
                        &#x1F30D;
                    </div>
                    <h2 class="text-xl font-bold dark:text-white">Trading Sessions</h2>
                </div>
                <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p>Performance is tracked across three major sessions (UTC):</p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        <div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border text-center">
                            <div class="font-semibold dark:text-white">Asian</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">00:00 - 08:00 UTC</div>
                        </div>
                        <div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border text-center">
                            <div class="font-semibold dark:text-white">London</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">08:00 - 16:00 UTC</div>
                        </div>
                        <div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border text-center">
                            <div class="font-semibold dark:text-white">New York</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">13:00 - 21:00 UTC</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Disqualification -->
            <section class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-red-200 dark:border-red-900/50 animate-fade-in-up">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl">
                        &#x26A0;&#xFE0F;
                    </div>
                    <h2 class="text-xl font-bold dark:text-white">Disqualification</h2>
                </div>
                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
                    <li>Using multiple accounts or trading on behalf of another participant.</li>
                    <li>Exploiting platform bugs or using prohibited strategies.</li>
                    <li>Any form of manipulation that provides an unfair advantage.</li>
                    <li>Decisions by the organizers are final.</li>
                </ul>
            </section>
        </div>

        <div class="mt-8 text-center">
            <a
                href="/leaderboard"
                class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
                View Leaderboard &rarr;
            </a>
        </div>
    </div>
</div>
