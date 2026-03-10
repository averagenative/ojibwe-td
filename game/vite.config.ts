import { defineConfig } from 'vite';
import { rmSync, existsSync } from 'fs';

export default defineConfig({
  publicDir: 'public',
  server: {
    port: 3001,
    strictPort: false,
    host: '0.0.0.0',
    open: true,
    allowedHosts: true,
    hmr: {
      // Long timeout prevents Vite from treating a backgrounded mobile tab
      // as a disconnected client and triggering a full page reload.
      timeout: 300000,
    },
  },
  build: {
    target:    'es2022',
    outDir:    'dist',
    sourcemap: false,  // do not expose source maps in production builds
    copyPublicDir: true,
  },
  // Exclude large non-shipping assets from the production build.
  // These folders live in public/ for local dev convenience but must not
  // end up in dist/ (and thus the Android/iOS AAB/IPA).
  plugins: [
    {
      name: 'exclude-non-shipping-assets',
      closeBundle() {
        const dirs = ['dist/assets/audio/source', 'dist/assets/logo-review'];
        for (const dir of dirs) {
          if (existsSync(dir)) {
            rmSync(dir, { recursive: true, force: true });
          }
        }
      },
    },
  ],
  test: {
    // Vitest config lives here alongside Vite config (zero extra config file)
    environment: 'jsdom',  // DOM available for any Phaser-adjacent code
    globals: true,          // describe/it/expect without imports in test files
    setupFiles: ['src/systems/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['src/scenes/**', 'src/main.ts'],  // skip Phaser scene files
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/systems/**', 'src/meta/**', 'src/data/**'],
    },
  },
});
