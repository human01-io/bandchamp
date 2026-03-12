<script lang="ts">
  import { page } from '$app/stores';
  import { isOnline, installPrompt, isInstalled, swUpdateAvailable, applySwUpdate, toggleTheme, theme } from '$lib/stores/ui';
  import { albumCount } from '$lib/stores/collection';
  import { wishlistCount } from '$lib/stores/wishlist';

  const navItems = [
    { href: '/', label: 'Home', icon: '⌂', badge: null },
    { href: '/collection', label: 'Collection', icon: '♫', badge: 'albums' },
    { href: '/graph', label: 'Graph', icon: '◉', badge: null },
    { href: '/discover', label: 'Discover', icon: '✦', badge: null },
    { href: '/wishlist', label: 'Wishlist', icon: '♡', badge: 'wishlist' },
    { href: '/settings', label: 'Settings', icon: '⚙', badge: null },
  ];

  let collapsed = $state(false);

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function getBadge(type: string | null): number {
    if (type === 'albums') return $albumCount;
    if (type === 'wishlist') return $wishlistCount;
    return 0;
  }

  async function handleInstall() {
    const prompt = $installPrompt as any;
    if (!prompt?.prompt) return;
    prompt.prompt();
  }
</script>

<!-- Desktop sidebar -->
<aside
  class="hidden h-screen flex-col border-r border-border bg-bg transition-all duration-200 md:flex
         {collapsed ? 'w-16' : 'w-56'}"
>
  <!-- Logo -->
  <div class="flex h-14 items-center gap-2 border-b border-border px-4">
    <span class="text-lg font-bold text-accent">BC</span>
    {#if !collapsed}
      <span class="text-sm font-semibold tracking-tight">Bandchamp</span>
    {/if}
  </div>

  <!-- Offline indicator -->
  {#if !$isOnline}
    <div class="mx-2 mt-2 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-1.5">
      <span class="h-2 w-2 rounded-full bg-warning"></span>
      {#if !collapsed}
        <span class="text-xs text-warning">Offline</span>
      {/if}
    </div>
  {/if}

  <!-- SW update banner -->
  {#if $swUpdateAvailable}
    <button
      onclick={applySwUpdate}
      class="mx-2 mt-2 rounded-lg bg-accent-dim px-3 py-1.5 text-xs text-accent hover:bg-accent/20"
    >
      {collapsed ? '↻' : 'Update available — click to refresh'}
    </button>
  {/if}

  <!-- Nav -->
  <nav class="flex-1 space-y-1 px-2 py-4">
    {#each navItems as item}
      {@const active = isActive(item.href, $page.url.pathname)}
      {@const badge = getBadge(item.badge)}
      <a
        href={item.href}
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
               {active
                 ? 'bg-accent-dim text-accent font-medium'
                 : 'text-text-muted hover:bg-bg-hover hover:text-text'}"
        title={collapsed ? item.label : undefined}
      >
        <span class="w-5 text-center text-base">{item.icon}</span>
        {#if !collapsed}
          <span class="flex-1">{item.label}</span>
          {#if badge > 0}
            <span class="rounded-full bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-dim">
              {badge}
            </span>
          {/if}
        {/if}
      </a>
    {/each}
  </nav>

  <!-- Bottom actions -->
  <div class="space-y-1 border-t border-border px-2 py-2">
    <!-- Theme toggle -->
    <button
      onclick={toggleTheme}
      class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-dim
             transition-colors hover:bg-bg-hover hover:text-text-muted"
      title={collapsed ? ($theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
    >
      <span class="w-5 text-center">{$theme === 'dark' ? '☀' : '☾'}</span>
      {#if !collapsed}
        <span>{$theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      {/if}
    </button>

    <!-- Install PWA -->
    {#if $installPrompt && !$isInstalled}
      <button
        onclick={handleInstall}
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-accent
               transition-colors hover:bg-accent-dim"
        title={collapsed ? 'Install app' : undefined}
      >
        <span class="w-5 text-center">⤓</span>
        {#if !collapsed}
          <span>Install App</span>
        {/if}
      </button>
    {/if}

    <!-- Collapse toggle -->
    <button
      onclick={() => (collapsed = !collapsed)}
      class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-dim
             transition-colors hover:bg-bg-hover hover:text-text-muted"
    >
      <span class="w-5 text-center">{collapsed ? '→' : '←'}</span>
      {#if !collapsed}
        <span>Collapse</span>
      {/if}
    </button>
  </div>
</aside>

<!-- Mobile bottom nav -->
<nav
  class="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border
         bg-bg/95 backdrop-blur-sm safe-bottom md:hidden"
>
  {#each navItems as item}
    {@const active = isActive(item.href, $page.url.pathname)}
    {@const badge = getBadge(item.badge)}
    <a
      href={item.href}
      class="relative flex flex-col items-center gap-0.5 px-2 py-2 text-xs transition-colors
             {active ? 'text-accent' : 'text-text-dim'}"
    >
      <span class="text-lg">{item.icon}</span>
      <span class="text-[10px]">{item.label}</span>
      {#if badge > 0}
        <span class="absolute right-0 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-bg">
          {badge}
        </span>
      {/if}
    </a>
  {/each}
</nav>
