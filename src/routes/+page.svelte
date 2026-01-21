<script>
    import "../app.css";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    onMount(() => {
        goto("/leaderboard");
    });
</script>

<svelte:head>
    <meta http-equiv="refresh" content="0; url=/leaderboard" />
</svelte:head>

<!-- Redirecting to leaderboard... -->
