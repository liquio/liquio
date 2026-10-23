import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.mjs';

export default mergeConfig(viteConfig, defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.vitest.{ts,tsx}'],
    setupFiles: ['./src/setupVitest.ts'],
    restoreMocks: true
  }
}));
