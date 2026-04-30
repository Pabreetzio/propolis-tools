import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point workspace package directly at its TypeScript source in dev
      '@propolis-tools/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@propolis-tools/core/internal-test': resolve(__dirname, '../../packages/core/src/internal-test.ts'),
      '@propolis-tools/renderer': resolve(__dirname, '../../packages/renderer/src/index.ts'),
    },
  },
});
