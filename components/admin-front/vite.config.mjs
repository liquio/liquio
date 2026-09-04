import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgr from 'vite-plugin-svgr';
import { defineConfig, transformWithOxc } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolvePath = (...segments) => path.resolve(__dirname, ...segments);

const moduleRoots = [
  resolvePath('src/application'),
  resolvePath('../../packages/front-core'),
  resolvePath('src')
];

const extensions = ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'];

function resolveLocalModule(id) {
  const [moduleId, query] = id.split('?');
  for (const root of moduleRoots) {
    const candidate = path.join(root, moduleId);
    if (fsFileExists(candidate)) {
      return query ? `${candidate}?${query}` : candidate;
    }

    for (const ext of extensions) {
      const file = `${candidate}${ext}`;
      if (fsFileExists(file)) {
        return query ? `${file}?${query}` : file;
      }
    }

    for (const ext of extensions) {
      const indexFile = path.join(candidate, `index${ext}`);
      if (fsFileExists(indexFile)) {
        return query ? `${indexFile}?${query}` : indexFile;
      }
    }
  }

  return null;
}

function fsFileExists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function webpackModuleRoots() {
  return {
    name: 'webpack-module-roots',
    async resolveId(id, importer, options) {
      if (!importer || id.startsWith('.') || id.startsWith('/') || id.includes('\0')) {
        return null;
      }

      const resolved = resolveLocalModule(id);
      if (resolved) {
        return this.resolve(resolved, importer, { ...options, skipSelf: true });
      }

      return this.resolve(id, resolvePath('index.html'), { ...options, skipSelf: true });
    }
  };
}

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

function jsxInJs() {
  return {
    name: 'jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (
        !id.endsWith('.js') ||
        id.includes('/node_modules/') ||
        !(id.includes('/src/') || id.includes('/packages/front-core/'))
      ) {
        return null;
      }

      return transformWithOxc(code, id, {
        lang: 'jsx'
      });
    }
  };
}

function reactVirtualizedPropTypes() {
  return {
    name: 'react-virtualized-prop-types',
    transform(code, id) {
      if (
        !(id.includes('/react-virtualized/dist/es/') || id.includes('/react-sortable-tree/')) ||
        !code.includes('bpfrpt_proptype_')
      ) {
        return null;
      }

      const transformed = code
        .replace(/import\s+\{\s*bpfrpt_proptype_[^}]+\}\s+from\s+["'][^"']+["'];?\s*/g, '')
        .replace(/export\s+\{\s*bpfrpt_proptype_[^}]+\};?\s*/g, '');

      const shims = [...new Set(transformed.match(/\bbpfrpt_proptype_\w+/g) || [])]
        .map((name) => `var ${name} = {};`)
        .join('\n');

      return shims ? `${shims}\n${transformed}` : transformed;
    }
  };
}

function postcssBrowserCompatibility() {
  const stubs = {
    fs: resolvePath('../../packages/front-core/vite-browser-stubs/postcss-fs.js'),
    'source-map-js': resolvePath('../../packages/front-core/vite-browser-stubs/source-map-js.js'),
    url: resolvePath('../../packages/front-core/vite-browser-stubs/postcss-url.js')
  };

  return {
    name: 'postcss-browser-compatibility',
    enforce: 'pre',
    resolveId(id, importer) {
      if (!importer || !stubs[id] || !importer.includes('/node_modules/postcss/lib/')) {
        return null;
      }

      return stubs[id];
    }
  };
}

function muiBrowserEntrypoints() {
  const packages = {
    '@mui/private-theming': resolvePath('node_modules/@mui/private-theming'),
    '@mui/styles': resolvePath('node_modules/@mui/styles')
  };

  return {
    name: 'mui-browser-entrypoints',
    enforce: 'pre',
    resolveId(id) {
      for (const [packageName, packageRoot] of Object.entries(packages)) {
        if (id === packageName) {
          return path.join(packageRoot, 'index.js');
        }

        if (id.startsWith(`${packageName}/`)) {
          const subpath = id.slice(packageName.length + 1);
          const indexFile = path.join(packageRoot, subpath, 'index.js');
          if (fsFileExists(indexFile)) {
            return indexFile;
          }
        }
      }

      return null;
    }
  };
}

export default defineConfig({
  assetsInclude: ['**/*.htm', '**/*.xml'],
  plugins: [
    webpackModuleRoots(),
    muiBrowserEntrypoints(),
    postcssBrowserCompatibility(),
    craSvgImports(),
    jsxInJs(),
    reactVirtualizedPropTypes(),
    svgr(),
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      include: ['buffer', 'crypto', 'path', 'process', 'stream', 'util', 'vm']
    })
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      core: resolvePath('../../packages/front-core'),
      'mime-types': resolvePath('node_modules/mime-types'),
      'pdfjs-dist/build/pdf': resolvePath('node_modules/pdfjs-dist/build/pdf.mjs'),
      'react-syntax-highlighter/dist/esm/styles/prism': resolvePath(
        'node_modules/react-syntax-highlighter/dist/esm/styles/prism'
      )
    }
  },
  define: {
    'process.env.PUBLIC_URL': JSON.stringify('')
  },
  server: {
    fs: {
      allow: [resolvePath('../..')]
    }
  },
  optimizeDeps: {
    entries: ['index.html'],
    rolldownOptions: {
      plugins: [muiBrowserEntrypoints(), postcssBrowserCompatibility(), reactVirtualizedPropTypes()],
      moduleTypes: {
        '.js': 'jsx'
      }
    }
  },
  build: {
    outDir: 'build',
    sourcemap: process.env.GENERATE_SOURCEMAP === 'true',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  },
  worker: {
    plugins: () => [
      webpackModuleRoots(),
      muiBrowserEntrypoints(),
      postcssBrowserCompatibility(),
      craSvgImports(),
      jsxInJs(),
      reactVirtualizedPropTypes(),
      svgr(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true
        },
        include: ['buffer', 'crypto', 'path', 'process', 'stream', 'util', 'vm']
      })
    ]
  }
});
