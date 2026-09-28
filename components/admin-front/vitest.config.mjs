import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(viteConfig, defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@testing-library/react': require.resolve('@testing-library/react'),
      // admin-front doesn't have a "tasks" module - see src/testStubs/SuccessMessage.tsx.
      'modules/tasks/pages/Task/components/SuccessMessage': path.resolve(__dirname, 'src/testStubs/SuccessMessage.tsx')
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.vitest.{ts,tsx}', '../../packages/front-core/**/*.vitest.{ts,tsx}'],
    setupFiles: ['./src/setupVitest.ts'],
    restoreMocks: true
  }
}));
