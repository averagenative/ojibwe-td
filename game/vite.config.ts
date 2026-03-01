import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    // Vitest config lives here alongside Vite config (zero extra config file)
    environment: 'jsdom',  // DOM available for any Phaser-adjacent code
    globals: true,          // describe/it/expect without imports in test files
    include: ['src/**/*.test.ts'],
    exclude: ['src/scenes/**', 'src/main.ts'],  // skip Phaser scene files
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/systems/**', 'src/meta/**', 'src/data/**'],
    },
  },
});
