import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'copy-manifest',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
        copyFileSync(resolve(__dirname, 'manifest.json'), resolve(distDir, 'manifest.json'));

        // Copy favicon as extension icon placeholder
        const iconsDir = resolve(distDir, 'icons');
        if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content/bandcamp.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
