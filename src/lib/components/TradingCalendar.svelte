<script lang="ts">
    import { createEventDispatcher } from "svelte";

    // Types
    interface DayData {
        date: string;
        profit: number;
        totalTrades?: number;
        winRate?: number;
        bestTrade?: number;
        worstTrade?: number;
    }

    interface CalendarDay {
        date: Date;
        dayOfMonth: number;
        isCurrentMonth: boolean;
        isToday: boolean;
        data: DayData | null;
    }

    interface WeekSummary {
        weekNumber: number;
        totalPnL: number;
        tradingDays: number;
        totalTrades: number;
    }

    // Props
    export let dailyData: DayData[] = [];

    // State - initialize to latest data date or current date
    let currentDate = new Date();
    let selectedDay: CalendarDay | null = null;
    let showDayModal = false;
    let showStats = false; // Collapsed by default
    let initialized = false;

    // Initialize calendar to show the month with the most recent data
    $: if (dailyData.length > 0 && !initialized) {
        const latestDate = dailyData[dailyData.length - 1]?.date;
        if (latestDate) {
            currentDate = new Date(latestDate);
            initialized = true;
        }
    }

    const dispatch = createEventDispatcher();

    // Days of the week (abbreviated) - Calendar starts from Sunday
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    // Create a lookup map for daily data FIRST
    $: dataMap = new Map(dailyData.map((d) => [d.date, d]));

    // Reactive calculations
    $: currentMonth = currentDate.getMonth();
    $: currentYear = currentDate.getFullYear();
    $: calendarDays = generateCalendarDays(currentYear, currentMonth, dataMap);
    $: weeks = groupIntoWeeks(calendarDays);
    $: weekSummaries = calculateWeekSummaries(weeks);
    $: monthStats = calculateMonthStats(calendarDays);

    function generateCalendarDays(
        year: number,
        month: number,
        dataMap: Map<string, DayData>,
    ): CalendarDay[] {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days: CalendarDay[] = [];

        // Add days from previous month to fill the first week
        const firstDayOfWeek = firstDay.getDay();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            const dateStr = formatDateKey(date);
            days.push({
                date,
                dayOfMonth: date.getDate(),
                isCurrentMonth: false,
                isToday: date.getTime() === today.getTime(),
                data: dataMap.get(dateStr) || null,
            });
        }

        // Add days of current month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDateKey(date);
            days.push({
                date,
                dayOfMonth: day,
                isCurrentMonth: true,
                isToday: date.getTime() === today.getTime(),
                data: dataMap.get(dateStr) || null,
            });
        }

        // Add days from next month to complete the last week
        const remainingDays = 7 - (days.length % 7);
        if (remainingDays < 7) {
            for (let i = 1; i <= remainingDays; i++) {
                const date = new Date(year, month + 1, i);
                const dateStr = formatDateKey(date);
                days.push({
                    date,
                    dayOfMonth: i,
                    isCurrentMonth: false,
                    isToday: date.getTime() === today.getTime(),
                    data: dataMap.get(dateStr) || null,
                });
            }
        }

        return days;
    }

    function formatDateKey(date: Date): string {
        // Use Thailand timezone (UTC+7) for date key
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function groupIntoWeeks(days: CalendarDay[]): CalendarDay[][] {
        const weeks: CalendarDay[][] = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }
        return weeks;
    }

    function calculateWeekSummaries(weeks: CalendarDay[][]): WeekSummary[] {
        return weeks.map((week, index) => {
            const daysWithData = week.filter((d) => d.isCurrentMonth && d.data);
            return {
                weekNumber: index + 1,
                totalPnL: daysWithData.reduce(
                    (sum, d) => sum + (d.data?.profit || 0),
                    0,
                ),
                tradingDays: daysWithData.length,
                totalTrades: daysWithData.reduce(
                    (sum, d) => sum + (d.data?.totalTrades || 0),
                    0,
                ),
            };
        });
    }

    function calculateMonthStats(days: CalendarDay[]) {
        const monthDays = days.filter((d) => d.isCurrentMonth && d.data);
        if (monthDays.length === 0) {
            return {
                totalPnL: 0,
                bestDay: null as CalendarDay | null,
                worstDay: null as CalendarDay | null,
                avgDaily: 0,
                winRate: 0,
                totalTrades: 0,
                tradingDays: 0,
                profitableDays: 0,
                lossDays: 0,
            };
        }

        const profits = monthDays.map((d) => d.data!.profit);
        const bestDay = monthDays.reduce(
            (best, d) =>
                d.data!.profit > (best.data?.profit || -Infinity) ? d : best,
            monthDays[0],
        );
        const worstDay = monthDays.reduce(
            (worst, d) =>
                d.data!.profit < (worst.data?.profit || Infinity) ? d : worst,
            monthDays[0],
        );

        return {
            totalPnL: profits.reduce((a, b) => a + b, 0),
            bestDay,
            worstDay,
            avgDaily: profits.reduce((a, b) => a + b, 0) / monthDays.length,
            winRate:
                monthDays.reduce((sum, d) => sum + (d.data?.winRate || 0), 0) /
                monthDays.length,
            totalTrades: monthDays.reduce(
                (sum, d) => sum + (d.data?.totalTrades || 0),
                0,
            ),
            tradingDays: monthDays.length,
            profitableDays: monthDays.filter((d) => d.data!.profit > 0).length,
            lossDays: monthDays.filter((d) => d.data!.profit < 0).length,
        };
    }

    // Navigation
    function previousMonth() {
        currentDate = new Date(currentYear, currentMonth - 1, 1);
    }

    function nextMonth() {
        currentDate = new Date(currentYear, currentMonth + 1, 1);
    }

    function goToToday() {
        currentDate = new Date();
    }

    // Day click handler
    function handleDayClick(day: CalendarDay) {
        if (day.data) {
            selectedDay = day;
            showDayModal = true;
        }
    }

    function closeDayModal() {
        showDayModal = false;
        selectedDay = null;
    }

    // Color helpers
    function getProfitColor(profit: number): string {
        if (profit === 0 || profit === undefined)
            return "bg-gray-100 dark:bg-dark-border/50";
        if (profit > 500) return "bg-emerald-500";
        if (profit > 100) return "bg-emerald-400";
        if (profit > 0) return "bg-emerald-300";
        if (profit > -100) return "bg-red-300";
        if (profit > -500) return "bg-red-400";
        return "bg-red-500";
    }

    function getProfitTextColor(profit: number): string {
        if (profit > 0) return "text-emerald-600 dark:text-emerald-400";
        if (profit < 0) return "text-red-600 dark:text-red-400";
        return "text-gray-500 dark:text-gray-400";
    }

    function formatMoney(amount: number): string {
        const sign = amount >= 0 ? "+" : "-";
        return (
            sign +
            "$" +
            Math.abs(amount).toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            })
        );
    }

    function formatMoneyFull(amount: number): string {
        const sign = amount >= 0 ? "+" : "";
        return (
            sign +
            "$" +
            Math.abs(amount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
        );
    }
</script>

<div
    class="trading-calendar bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden"
>
    <!-- Compact Header with Month Stats -->
    <div class="p-3 border-b border-gray-100 dark:border-dark-border">
        <div class="flex items-center justify-between gap-2 flex-wrap">
            <!-- Title & Navigation -->
            <div class="flex items-center gap-2">
                <svg
                    class="w-4 h-4 text-blue-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
                <div class="flex items-center gap-1">
                    <button
                        on:click={previousMonth}
                        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                        aria-label="Previous month"
                    >
                        <svg
                            class="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <span
                        class="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[100px] text-center"
                    >
                        {monthNames[currentMonth].slice(0, 3)}
                        {currentYear}
                    </span>
                    <button
                        on:click={nextMonth}
                        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                        aria-label="Next month"
                    >
                        <svg
                            class="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                    <button
                        on:click={goToToday}
                        class="ml-1 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        Today
                    </button>
                </div>
            </div>

            <!-- Quick Stats (inline) -->
            <div class="flex items-center gap-3 text-xs">
                <div class="flex items-center gap-1">
                    <span class="text-gray-500">Month:</span>
                    <span
                        class="font-bold {getProfitTextColor(
                            monthStats.totalPnL,
                        )}">{formatMoney(monthStats.totalPnL)}</span
                    >
                </div>
                <div class="hidden sm:flex items-center gap-1">
                    <span class="text-gray-500">Days:</span>
                    <span class="font-medium text-gray-700 dark:text-gray-300"
                        >{monthStats.profitableDays}W/{monthStats.lossDays}L</span
                    >
                </div>
                <div class="hidden md:flex items-center gap-1">
                    <span class="text-gray-500">Trades:</span>
                    <span class="font-medium text-gray-700 dark:text-gray-300"
                        >{monthStats.totalTrades}</span
                    >
                </div>
                <button
                    on:click={() => (showStats = !showStats)}
                    class="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                    aria-label="Toggle stats"
                >
                    <svg
                        class="w-4 h-4 text-gray-500 transition-transform {showStats
                            ? 'rotate-180'
                            : ''}"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Expandable Stats Panel -->
        {#if showStats}
            <div
                class="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border"
            >
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                    <div
                        class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded text-center"
                    >
                        <div class="text-gray-500 mb-0.5">Total</div>
                        <div
                            class="font-bold {getProfitTextColor(
                                monthStats.totalPnL,
                            )}"
                        >
                            {formatMoney(monthStats.totalPnL)}
                        </div>
                    </div>
                    <div
                        class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded text-center"
                    >
                        <div class="text-gray-500 mb-0.5">Best</div>
                        <div
                            class="font-bold {monthStats.bestDay
                                ? getProfitTextColor(
                                      monthStats.bestDay.data?.profit || 0,
                                  )
                                : 'text-gray-400'}"
                        >
                            {monthStats.bestDay
                                ? formatMoney(
                                      monthStats.bestDay.data?.profit || 0,
                                  )
                                : "-"}
                        </div>
                    </div>
                    <div
                        class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded text-center"
                    >
                        <div class="text-gray-500 mb-0.5">Worst</div>
                        <div
                            class="font-bold {monthStats.worstDay
                                ? getProfitTextColor(
                                      monthStats.worstDay.data?.profit || 0,
                                  )
                                : 'text-gray-400'}"
                        >
                            {monthStats.worstDay
                                ? formatMoney(
                                      monthStats.worstDay.data?.profit || 0,
                                  )
                                : "-"}
                        </div>
                    </div>
                    <div
                        class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded text-center"
                    >
                        <div class="text-gray-500 mb-0.5">Avg/Day</div>
                        <div
                            class="font-bold {getProfitTextColor(
                                monthStats.avgDaily,
                            )}"
                        >
                            {formatMoney(monthStats.avgDaily)}
                        </div>
                    </div>
                    <div
                        class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded text-center"
                    >
                        <div class="text-gray-500 mb-0.5">Days</div>
                        <div class="font-bold text-gray-700 dark:text-gray-300">
                            {monthStats.tradingDays}
                        </div>
                    </div>
                    <div
                        class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded text-center"
                    >
                        <div class="text-gray-500 mb-0.5">Trades</div>
                        <div class="font-bold text-gray-700 dark:text-gray-300">
                            {monthStats.totalTrades}
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Compact Calendar Grid -->
    <div class="p-2">
        <!-- Days of Week Header -->
        <div class="grid grid-cols-7 gap-0.5 mb-1">
            {#each daysOfWeek as day, i}
                <div
                    class="text-center text-[10px] font-semibold py-1 {i === 0
                        ? 'text-red-400'
                        : i === 6
                          ? 'text-blue-400'
                          : 'text-gray-400'}"
                >
                    {day}
                </div>
            {/each}
        </div>

        <!-- Calendar Days - Compact Grid -->
        <div class="grid grid-cols-7 gap-0.5">
            {#each calendarDays as day}
                <button
                    class="relative aspect-square flex flex-col items-center justify-center rounded transition-all duration-150 group
                        {day.isCurrentMonth ? '' : 'opacity-30'}
                        {day.isToday ? 'ring-1 ring-blue-500' : ''}
                        {day.data
                        ? 'cursor-pointer hover:ring-1 hover:ring-gray-300'
                        : 'cursor-default'}
                        {getProfitColor(day.data?.profit || 0)}"
                    on:click={() => handleDayClick(day)}
                    disabled={!day.data}
                >
                    <span
                        class="text-[10px] sm:text-xs font-medium {day.isToday
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300'}"
                    >
                        {day.dayOfMonth}
                    </span>

                    {#if day.data && day.isCurrentMonth}
                        <span
                            class="text-[8px] sm:text-[10px] font-bold {getProfitTextColor(
                                day.data.profit,
                            )} truncate max-w-full px-0.5"
                        >
                            {formatMoney(day.data.profit)}
                        </span>
                    {/if}

                    <!-- Hover Tooltip -->
                    {#if day.data}
                        <div
                            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg"
                        >
                            <div class="font-semibold">
                                {day.date.toLocaleDateString("th-TH", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </div>
                            <div class={getProfitTextColor(day.data.profit)}>
                                {formatMoneyFull(day.data.profit)}
                            </div>
                            <div class="text-gray-300">
                                {day.data.totalTrades || 0} trades • {(
                                    day.data.winRate || 0
                                ).toFixed(0)}%
                            </div>
                        </div>
                    {/if}
                </button>
            {/each}
        </div>

        <!-- Compact Legend -->
        <div
            class="flex items-center justify-center gap-1 mt-2 text-[9px] text-gray-400"
        >
            <span>Loss</span>
            <div class="w-2.5 h-2.5 rounded-sm bg-red-500"></div>
            <div class="w-2.5 h-2.5 rounded-sm bg-red-300"></div>
            <div
                class="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-dark-border/50"
            ></div>
            <div class="w-2.5 h-2.5 rounded-sm bg-emerald-300"></div>
            <div class="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
            <span>Profit</span>
        </div>
    </div>

    <!-- Weekly Summary - Compact Horizontal -->
    <div class="px-2 pb-2">
        <div class="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {#each weekSummaries as week}
                {#if week.tradingDays > 0}
                    <div
                        class="flex-shrink-0 px-2 py-1.5 bg-gray-50 dark:bg-dark-bg/50 rounded text-center min-w-[60px]"
                    >
                        <div class="text-[9px] text-gray-400">
                            W{week.weekNumber}
                        </div>
                        <div
                            class="text-xs font-bold {getProfitTextColor(
                                week.totalPnL,
                            )}"
                        >
                            {formatMoney(week.totalPnL)}
                        </div>
                        <div class="text-[8px] text-gray-400">
                            {week.totalTrades}t
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    </div>
</div>

<!-- Day Detail Modal -->
{#if showDayModal && selectedDay?.data}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        on:click={closeDayModal}
        on:keydown={(e) => e.key === "Escape" && closeDayModal()}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
    >
        <div
            class="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-sm w-full overflow-hidden"
            on:click|stopPropagation
            on:keydown|stopPropagation
            role="document"
        >
            <!-- Modal Header -->
            <div
                class="p-3 border-b border-gray-100 dark:border-dark-border flex items-center justify-between"
            >
                <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                    {selectedDay.date.toLocaleDateString("th-TH", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                    })}
                </h3>
                <button
                    on:click={closeDayModal}
                    class="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded transition-colors"
                    aria-label="Close modal"
                >
                    <svg
                        class="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Modal Body -->
            <div class="p-4">
                <!-- Main P&L -->
                <div class="text-center mb-4">
                    <div
                        class="text-2xl font-bold {getProfitTextColor(
                            selectedDay.data.profit,
                        )}"
                    >
                        {formatMoneyFull(selectedDay.data.profit)}
                    </div>
                    <div class="text-xs text-gray-500">Daily P&L</div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-2 text-center">
                    <div class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded">
                        <div
                            class="text-lg font-bold text-gray-800 dark:text-gray-200"
                        >
                            {selectedDay.data.totalTrades || 0}
                        </div>
                        <div class="text-[10px] text-gray-500">Trades</div>
                    </div>
                    <div class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded">
                        <div
                            class="text-lg font-bold text-blue-600 dark:text-blue-400"
                        >
                            {(selectedDay.data.winRate || 0).toFixed(0)}%
                        </div>
                        <div class="text-[10px] text-gray-500">Win Rate</div>
                    </div>
                    {#if selectedDay.data.bestTrade}
                        <div class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded">
                            <div
                                class="text-sm font-bold text-emerald-600 dark:text-emerald-400"
                            >
                                {formatMoney(selectedDay.data.bestTrade)}
                            </div>
                            <div class="text-[10px] text-gray-500">Best</div>
                        </div>
                    {/if}
                    {#if selectedDay.data.worstTrade}
                        <div class="p-2 bg-gray-50 dark:bg-dark-bg/50 rounded">
                            <div
                                class="text-sm font-bold text-red-600 dark:text-red-400"
                            >
                                {formatMoney(selectedDay.data.worstTrade)}
                            </div>
                            <div class="text-[10px] text-gray-500">Worst</div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .trading-calendar {
        position: relative;
    }

    .scrollbar-thin::-webkit-scrollbar {
        height: 4px;
    }

    .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
    }

    .scrollbar-thin::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 2px;
    }

    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
    }
</style>
