/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Or your framework plugin (vue, svelte, etc.)

export default defineConfig({
  plugins: [react()],
  test: {
    // 1. Specify your test environment (e.g., 'jsdom' or 'happy-dom' for frontend UI)
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    // Browser tests run with Playwright (npm run test:e2e), never under Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    
    // 2. Configure code coverage
    coverage: {
      provider: 'v8', // or 'istanbul'
      
      // Specify which files to include or exclude
      include: ['src/**/*.{js,jsx,ts,tsx}'], 
      exclude: [
        'src/main.jsx',
        'src/vite-env.d.ts',
        '**/*.test.{js,jsx,ts,tsx}'
      ],
      
      // Change report formats ('html' generates a visual webpage to inspect coverage)
      reporter: ['text', 'json', 'html'],
      
      // Optional: Enforce coverage thresholds (fails build if not met)
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },
  },
});

