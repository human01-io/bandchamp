import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// ─── Online/Offline ──────────────────────

export const isOnline = writable(true);

if (browser) {
  isOnline.set(navigator.onLine);
  window.addEventListener('online', () => isOnline.set(true));
  window.addEventListener('offline', () => isOnline.set(false));
}

// ─── PWA Install Prompt ──────────────────

export const installPrompt = writable<Event | null>(null);
export const isInstalled = writable(false);

if (browser) {
  // Capture the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt.set(e);
  });

  // Detect if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled.set(true);
  }

  window.addEventListener('appinstalled', () => {
    isInstalled.set(true);
    installPrompt.set(null);
  });
}

// ─── SW Update ───────────────────────────

export const swUpdateAvailable = writable(false);
let waitingWorker: ServiceWorker | null = null;

if (browser && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = newWorker;
          swUpdateAvailable.set(true);
        }
      });
    });
  });
}

export function applySwUpdate() {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

// ─── Theme ───────────────────────────────

export type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  if (!browser) return 'dark';
  const stored = localStorage.getItem('bandchamp-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export const theme = writable<Theme>(getInitialTheme());

if (browser) {
  theme.subscribe((t) => {
    localStorage.setItem('bandchamp-theme', t);
    document.documentElement.classList.toggle('light', t === 'light');
  });
}

export function toggleTheme() {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}

// ─── Offline Audio Cache ────────────────

function getInitialOfflineAudio(): boolean {
  if (!browser) return false;
  return localStorage.getItem('bandchamp-offline-audio') === 'true';
}

export const offlineAudioEnabled = writable(getInitialOfflineAudio());

if (browser) {
  offlineAudioEnabled.subscribe((v) => {
    localStorage.setItem('bandchamp-offline-audio', String(v));
  });
}

export function toggleOfflineAudio() {
  offlineAudioEnabled.update((v) => !v);
}
