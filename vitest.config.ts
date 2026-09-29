import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, 'src/test/setup.ts')],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true,
    isolate: true,
    restoreMocks: true,
    mockReset: true,
    clearMocks: true,
    // Memory optimization settings - force sequential execution
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1,
        singleFork: true,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Force garbage collection between tests
    sequence: {
      shuffle: false,
      concurrent: false,
    },
    maxConcurrency: 1,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/test/**', 'src/**/*.css', 'src/**/types.ts'],
    },
  },
})


