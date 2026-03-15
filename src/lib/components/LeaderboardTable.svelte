<script lang="ts">
  import type { LeaderboardEntry } from "$lib/mock/leaderboard";

  export let data: LeaderboardEntry[] = [];

  $: sortedData = [...data].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.profit - a.profit;
  });

  function formatProfit(profit: number): string {
    const sign = profit > 0 ? "+" : "";
    return `${sign}${profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getRankIcon(rank: number): string {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  function getRankChangeDisplay(change: number | undefined): { text: string; class: string } {
    if (change == null || change === 0) return { text: '-', class: 'text-gray-500' };
    if (change > 0) return { text: `▲${change}`, class: 'text-green-400' };
    return { text: `▼${Math.abs(change)}`, class: 'text-red-400' };
  }
</script>

<div class="card">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-gray-200 dark:border-dark-border text-gray-500 text-xs">
          <th class="text-left py-2">Rank</th>
          <th class="text-left py-2">Nickname</th>
          <th class="text-right py-2">Points</th>
          <th class="text-right py-2">Profit (USD)</th>
          <th class="text-right py-2">Win Rate</th>
          <th class="text-right py-2">Trades</th>
        </tr>
      </thead>
      <tbody>
        {#if sortedData.length === 0}
          <tr>
            <td colspan="6" class="py-8 text-center text-gray-500">No participants yet.</td>
          </tr>
        {:else}
          {#each sortedData as entry, index}
            {@const rank = index + 1}
            <tr
              class="border-b border-gray-100 dark:border-dark-border/40 hover:bg-gray-50 dark:hover:bg-dark-border/20 cursor-pointer"
              on:click={() => (window.location.href = `/leaderboard/${entry.id}`)}
            >
              <td class="py-3">
                <div class="flex items-center gap-2">
                  <span class="text-base">{getRankIcon(rank)}</span>
                  <span class="text-[10px] font-semibold {getRankChangeDisplay(entry.rankChange).class}">
                    {getRankChangeDisplay(entry.rankChange).text}
                  </span>
                </div>
              </td>
              <td class="py-3">
                <div class="font-medium text-gray-900 dark:text-white">{entry.nickname}</div>
              </td>
              <td class="py-3 text-right font-bold text-gray-900 dark:text-white">
                {entry.points.toLocaleString()}
              </td>
              <td class="py-3 text-right font-medium {entry.profit >= 0 ? 'text-green-400' : 'text-red-400'}">
                {formatProfit(entry.profit)}
              </td>
              <td class="py-3 text-right {(entry.stats?.winRate ?? 0) >= 50 ? 'text-green-400' : 'text-red-400'}">
                {entry.stats?.winRate != null ? `${entry.stats.winRate.toFixed(1)}%` : '-'}
              </td>
              <td class="py-3 text-right text-gray-600 dark:text-gray-300">
                {entry.stats?.totalTrades?.toLocaleString() ?? '-'}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
