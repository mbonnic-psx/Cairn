import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Cairn is a desktop app. The dev server exists for Tauri to load a window from
// and is bound to localhost only — nothing here is served to a network.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    // Watch only what the window loads. Without this the dev server also watched
    // the Rust build output (12 GB, 20,000 files) and every spec, and reloaded
    // the window on each edit. Left running, that helped take WSL down on
    // 2026-10-02. Tauri's own guide ignores src-tauri; its watcher rebuilds Rust.
    watch: {
      ignored: [
        '**/src-tauri/**',
        '**/specs/**',
        '**/.specify/**',
        '**/delivery/**',
        '**/design/**',
        '**/.stryker-tmp/**',
        '**/reports/**',
      ],
    },
  },
  build: {
    target: 'chrome110',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
