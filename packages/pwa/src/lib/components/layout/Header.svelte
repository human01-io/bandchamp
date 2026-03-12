<script lang="ts">
  import { page } from '$app/stores';

  let {
    searchQuery = $bindable(''),
    onSearch,
    showSearch = true,
  }: {
    searchQuery?: string;
    onSearch?: (query: string) => void;
    showSearch?: boolean;
  } = $props();

  const titles: Record<string, string> = {
    '/': 'Home',
    '/collection': 'Collection',
    '/graph': 'Network Graph',
    '/discover': 'Discover',
    '/wishlist': 'Wishlist',
    '/settings': 'Settings',
  };

  const pageTitle = $derived(() => {
    const path = $page.url.pathname;
    for (const [prefix, title] of Object.entries(titles)) {
      if (prefix === '/' ? path === '/' : path.startsWith(prefix)) return title;
    }
    return 'Bandchamp';
  });
</script>

<header class="flex h-14 items-center justify-between border-b border-border bg-bg px-4 sm:px-6">
  <h1 class="shrink-0 text-lg font-semibold">{pageTitle()}</h1>

  {#if showSearch}
    <div class="relative ml-3 w-full max-w-xs sm:ml-0 sm:w-64">
      <input
        type="search"
        bind:value={searchQuery}
        oninput={() => onSearch?.(searchQuery)}
        placeholder="Search..."
        class="w-full rounded-lg border border-border bg-bg-input px-4 py-1.5 pl-9 text-sm text-text
               placeholder:text-text-dim focus:border-border-focus focus:outline-none"
      />
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">
        ⌕
      </span>
    </div>
  {/if}
</header>
