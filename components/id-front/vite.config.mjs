import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolvePath = (...segments) => path.resolve(__dirname, ...segments);

// Bare imports such as `helpers/x` or `assets/img/x.svg` resolve against `src`
// (the old jsconfig `baseUrl`). Aliasing only the top-level directories keeps
// package imports untouched.
const srcDirs = [
  'actions',
  'assets',
  'components',
  'containers',
  'helpers',
  'layouts',
  'pages',
  'reducers',
  'routes',
  'services',
  'store',
  'themes',
  'variables'
];

const alias = srcDirs.map((dir) => ({
  find: new RegExp(`^${dir}(?=/|$)`),
  replacement: resolvePath('src', dir)
}));

// CRA-style `import { ReactComponent as X } from 'x.svg'` -> svgr default export.
function craSvgImports() {
  return {
    name: 'cra-svg-imports',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.[jt]sx?$/.test(id) || !code.includes('ReactComponent')) {
        return null;
      }

      return code.replace(
        /import\s+\{\s*ReactComponent\s+as\s+([A-Za-z_$][\w$]*)\s*\}\s+from\s+(['"])([^'"]+\.svg)\2\s*;?/g,
        'import $1 from "$3?react";'
      );
    }
  };
}

export default defineConfig({
  plugins: [
    craSvgImports(),
    svgr(),
    react(),
    // Buffer/process globals for node-forge (PKCS7SignForm) and its deps; `stream` for
    // react-render-html -> parse5. crypto/util/os/https/events were never needed by the bundle:
    // node-forge only requires 'crypto' behind an isNodejs check, which is false here.
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      include: ['buffer', 'process', 'stream']
    })
  ],
  resolve: { alias },
  build: {
    outDir: 'build'
  }
});
