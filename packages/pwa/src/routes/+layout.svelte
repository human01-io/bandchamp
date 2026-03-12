<script lang="ts">
  import '../app.css';
  import Shell from '$lib/components/layout/Shell.svelte';
  import { loadCollection } from '$lib/stores/collection';
  import { loadWishlist } from '$lib/stores/wishlist';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    loadCollection();
    loadWishlist();
  });
</script>

<svelte:head>
  <title>Bandchamp</title>
  <meta name="description" content="Supercharge your Bandcamp experience" />
</svelte:head>

<Shell>
  {@render children()}
</Shell>
