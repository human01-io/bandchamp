<script lang="ts">
  import {
    filters,
    setSearch,
    setSort,
    setViewMode,
    resetFilters,
    toggleTag,
    activeFilterCount,
    type SortField,
  } from '$lib/stores/filters';
  import { allTags } from '$lib/stores/collection';

  let showTagDropdown = $state(false);
  let showMobileFilters = $state(false);

  const sortOptions: { value: SortField; label: string }[] = [
    { value: 'dateAdded', label: 'Date Added' },
    { value: 'title', label: 'Title' },
    { value: 'artist', label: 'Artist' },
    { value: 'rating', label: 'Rating' },
    { value: 'dateReleased', label: 'Release Date' },
  ];
</script>

<div class="border-b border-border bg-bg px-4 py-3 sm:px-6">
  <!-- Top row: search + mobile filter toggle -->
  <div class="flex items-center gap-2">
    <div class="relative min-w-0 flex-1">
      <input
        type="search"
        value={$filters.search}
        oninput={(e) => setSearch(e.currentTarget.value)}
        placeholder="Search albums, artists, tags..."
        class="w-full rounded-lg border border-border bg-bg-input px-4 py-2 pl-9 text-sm text-text
               placeholder:text-text-dim focus:border-border-focus focus:outline-none"
      />
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-dim">
        ⌕
      </span>
    </div>

    <!-- Mobile filter toggle -->
    <button
      onclick={() => (showMobileFilters = !showMobileFilters)}
      class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm
             transition-colors sm:hidden
             {$activeFilterCount > 0 ? 'border-accent text-accent' : 'text-text-muted'}"
    >
      Filters
      {#if $activeFilterCount > 0}
        <span class="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-bg">
          {$activeFilterCount}
        </span>
      {/if}
    </button>

    <!-- Desktop controls (always visible on sm+) -->
    <div class="hidden items-center gap-3 sm:flex">
      <!-- Tag filter -->
      <div class="relative">
        <button
          onclick={() => (showTagDropdown = !showTagDropdown)}
          class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors
                 {$filters.tags.length > 0
                   ? 'border-accent text-accent'
                   : 'border-border text-text-muted hover:border-border-focus hover:text-text'}"
        >
          Tags
          {#if $filters.tags.length > 0}
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-bg">
              {$filters.tags.length}
            </span>
          {/if}
        </button>

        {#if showTagDropdown}
          <div
            class="absolute left-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg
                   border border-border bg-bg-card p-2 shadow-xl"
          >
            {#each $allTags.slice(0, 50) as { tag, count }}
              <button
                onclick={() => toggleTag(tag)}
                class="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm transition-colors
                       {$filters.tags.includes(tag)
                         ? 'bg-accent-dim text-accent'
                         : 'text-text-muted hover:bg-bg-hover hover:text-text'}"
              >
                <span class="truncate">{tag}</span>
                <span class="ml-2 text-xs text-text-dim">{count}</span>
              </button>
            {/each}
          </div>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="fixed inset-0 z-40" onclick={() => (showTagDropdown = false)} onkeydown={() => {}}></div>
        {/if}
      </div>

      <!-- Rating filter -->
      <div class="flex items-center gap-1">
        {#each [1, 2, 3, 4, 5] as star}
          <button
            onclick={() => filters.update((f) => ({ ...f, minRating: f.minRating === star ? 0 : star }))}
            class="text-lg transition-colors
                   {star <= $filters.minRating ? 'text-warning' : 'text-text-dim hover:text-warning'}"
          >
            {star <= $filters.minRating ? '★' : '☆'}
          </button>
        {/each}
      </div>

      <!-- Sort -->
      <select
        value={$filters.sortBy}
        onchange={(e) => setSort(e.currentTarget.value as SortField)}
        class="rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-muted
               focus:border-border-focus focus:outline-none"
      >
        {#each sortOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>

      <!-- Sort direction -->
      <button
        onclick={() => filters.update((f) => ({ ...f, sortDir: f.sortDir === 'asc' ? 'desc' : 'asc' }))}
        class="rounded-lg border border-border px-2 py-2 text-sm text-text-muted
               transition-colors hover:border-border-focus hover:text-text"
        title={$filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
      >
        {$filters.sortDir === 'asc' ? '↑' : '↓'}
      </button>

      <!-- View mode -->
      <div class="flex overflow-hidden rounded-lg border border-border">
        <button
          onclick={() => setViewMode('grid')}
          class="px-2.5 py-1.5 text-sm transition-colors
                 {$filters.viewMode === 'grid' ? 'bg-bg-hover text-text' : 'text-text-dim hover:text-text-muted'}"
        >
          ▦
        </button>
        <button
          onclick={() => setViewMode('list')}
          class="border-l border-border px-2.5 py-1.5 text-sm transition-colors
                 {$filters.viewMode === 'list' ? 'bg-bg-hover text-text' : 'text-text-dim hover:text-text-muted'}"
        >
          ≡
        </button>
      </div>

      <!-- Clear filters -->
      {#if $activeFilterCount > 0}
        <button
          onclick={resetFilters}
          class="rounded-lg px-3 py-2 text-sm text-accent transition-colors hover:bg-accent-dim"
        >
          Clear ({$activeFilterCount})
        </button>
      {/if}
    </div>
  </div>

  <!-- Mobile expanded filters -->
  {#if showMobileFilters}
    <div class="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 sm:hidden">
      <!-- Tag filter -->
      <div class="relative">
        <button
          onclick={() => (showTagDropdown = !showTagDropdown)}
          class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors
                 {$filters.tags.length > 0
                   ? 'border-accent text-accent'
                   : 'border-border text-text-muted'}"
        >
          Tags
          {#if $filters.tags.length > 0}
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-bg">
              {$filters.tags.length}
            </span>
          {/if}
        </button>

        {#if showTagDropdown}
          <div
            class="absolute left-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg
                   border border-border bg-bg-card p-2 shadow-xl"
          >
            {#each $allTags.slice(0, 50) as { tag, count }}
              <button
                onclick={() => toggleTag(tag)}
                class="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm transition-colors
                       {$filters.tags.includes(tag)
                         ? 'bg-accent-dim text-accent'
                         : 'text-text-muted hover:bg-bg-hover hover:text-text'}"
              >
                <span class="truncate">{tag}</span>
                <span class="ml-2 text-xs text-text-dim">{count}</span>
              </button>
            {/each}
          </div>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="fixed inset-0 z-40" onclick={() => (showTagDropdown = false)} onkeydown={() => {}}></div>
        {/if}
      </div>

      <!-- Rating filter -->
      <div class="flex items-center gap-1">
        {#each [1, 2, 3, 4, 5] as star}
          <button
            onclick={() => filters.update((f) => ({ ...f, minRating: f.minRating === star ? 0 : star }))}
            class="text-lg transition-colors
                   {star <= $filters.minRating ? 'text-warning' : 'text-text-dim hover:text-warning'}"
          >
            {star <= $filters.minRating ? '★' : '☆'}
          </button>
        {/each}
      </div>

      <!-- Sort -->
      <select
        value={$filters.sortBy}
        onchange={(e) => setSort(e.currentTarget.value as SortField)}
        class="rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-muted
               focus:border-border-focus focus:outline-none"
      >
        {#each sortOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>

      <!-- Sort direction -->
      <button
        onclick={() => filters.update((f) => ({ ...f, sortDir: f.sortDir === 'asc' ? 'desc' : 'asc' }))}
        class="rounded-lg border border-border px-2 py-2 text-sm text-text-muted"
        title={$filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
      >
        {$filters.sortDir === 'asc' ? '↑' : '↓'}
      </button>

      <!-- View mode -->
      <div class="flex overflow-hidden rounded-lg border border-border">
        <button
          onclick={() => setViewMode('grid')}
          class="px-2.5 py-1.5 text-sm transition-colors
                 {$filters.viewMode === 'grid' ? 'bg-bg-hover text-text' : 'text-text-dim hover:text-text-muted'}"
        >
          ▦
        </button>
        <button
          onclick={() => setViewMode('list')}
          class="border-l border-border px-2.5 py-1.5 text-sm transition-colors
                 {$filters.viewMode === 'list' ? 'bg-bg-hover text-text' : 'text-text-dim hover:text-text-muted'}"
        >
          ≡
        </button>
      </div>

      <!-- Clear filters -->
      {#if $activeFilterCount > 0}
        <button
          onclick={resetFilters}
          class="rounded-lg px-3 py-2 text-sm text-accent transition-colors hover:bg-accent-dim"
        >
          Clear ({$activeFilterCount})
        </button>
      {/if}
    </div>
  {/if}
</div>
