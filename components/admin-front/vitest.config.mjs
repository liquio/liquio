import { createRequire } from 'node:module';
import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.mjs';

const require = createRequire(import.meta.url);

export default mergeConfig(viteConfig, defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: { '@testing-library/react': require.resolve('@testing-library/react') }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.vitest.{ts,tsx}', '../../packages/front-core/**/*.vitest.{ts,tsx}'],
    setupFiles: ['./src/setupVitest.ts'],
    restoreMocks: true
  }
}));
