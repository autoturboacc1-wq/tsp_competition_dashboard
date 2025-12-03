<script lang="ts">
  import type { LeaderboardEntry } from "$lib/mock/leaderboard";

  export let data: LeaderboardEntry[] = [];

  // Sort data: Points DESC, then Profit DESC
  $: sortedData = [...data].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return b.profit - a.profit;
  });

  function formatProfit(profit: number): string {
    const sign = profit > 0 ? "+" : "";
    return `${sign}${profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getRankStyle(rank: number): string {
    if (rank === 1) return "bg-yellow-100 border-yellow-400 text-yellow-900";
    if (rank === 2) return "bg-gray-100 border-gray-400 text-gray-900";
    if (rank === 3) return "bg-orange-100 border-orange-400 text-orange-900";
    return "bg-white border-gray-200 text-gray-700";
  }

  function getRankIcon(rank: number): string {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }
</script>

<div class="w-full overflow-x-auto shadow-md sm:rounded-lg">
  <table class="w-full text-sm text-left text-gray-500">
    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
      <tr>
        <th scope="col" class="px-6 py-3">Rank</th>
        <th scope="col" class="px-6 py-3">Nickname</th>
        <th scope="col" class="px-6 py-3 text-right">Points</th>
        <th scope="col" class="px-6 py-3 text-right">Profit (USD)</th>
      </tr>
    </thead>
    <tbody>
      {#if sortedData.length === 0}
        <tr>
          <td colspan="4" class="px-6 py-4 text-center">No participants yet.</td
          >
        </tr>
      {:else}
        {#each sortedData as entry, index}
          {@const rank = index + 1}
          <tr
            class="border-b {getRankStyle(
              rank,
            )} hover:bg-opacity-80 transition-colors cursor-pointer"
            on:click={() => (window.location.href = `/leaderboard/${entry.id}`)}
          >
            <td class="px-6 py-4 font-bold whitespace-nowrap">
              <span class="text-lg">{getRankIcon(rank)}</span>
            </td>
            <td class="px-6 py-4 font-medium whitespace-nowrap">
              {entry.nickname}
            </td>
            <td class="px-6 py-4 text-right font-bold">
              {entry.points.toLocaleString()}
            </td>
            <td
              class="px-6 py-4 text-right font-mono {entry.profit >= 0
                ? 'text-green-600'
                : 'text-red-600'}"
            >
              {formatProfit(entry.profit)}
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<!-- Mobile Card View (Visible only on small screens if needed, but table with overflow-x is often enough. 
     The user asked for "table can scroll horizontally OR turn into stacked cards". 
     I'll stick to the scrollable table for now as it's cleaner for leaderboards, 
     but I can add a card view if requested. 
     Actually, let's add a simple card view for very small screens to be "mobile-friendly" as requested.) -->
<div class="md:hidden space-y-4 mt-4">
  {#each sortedData as entry, index}
    {@const rank = index + 1}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="p-4 rounded-lg shadow border {getRankStyle(
        rank,
      )} flex justify-between items-center cursor-pointer"
      on:click={() => (window.location.href = `/leaderboard/${entry.id}`)}
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl">{getRankIcon(rank)}</span>
        <div>
          <div class="font-bold">{entry.nickname}</div>
          <div class="text-xs opacity-75">Rank {rank}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="font-bold">{entry.points.toLocaleString()} pts</div>
        <div
          class="font-mono text-sm {entry.profit >= 0
            ? 'text-green-600'
            : 'text-red-600'}"
        >
          {formatProfit(entry.profit)}
        </div>
      </div>
    </div>
  {/each}
</div>
