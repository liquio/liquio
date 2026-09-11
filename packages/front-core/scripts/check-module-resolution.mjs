import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Run from either app so shared code uses that app's dependency tree and overrides.
const appRoot = process.cwd();
const require = createRequire(path.join(appRoot, 'package.json'));
const ts = require('typescript');
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const configPath = path.join(appRoot, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, appRoot);
assert.deepEqual(parsed.errors, []);
const server = await createServer({
  server: { middlewareMode: true, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [], entries: [] }
});

try {
  const importer = path.join(appRoot, '../../packages/front-core/actions/auth.js');
  const specifiers = [
    'actions/files', // App overrides shared actions in both frontends.
    'helpers/getCookie', // Newly migrated shared TypeScript module.
    'components/HighlightText', // Shared JSX directory index.
    'core/helpers/getCookie', // Explicit core alias bypasses app overrides.
    'theme', // Cabinet's superstructure takes precedence.
    'store/types', // Each app derives state from its own reducer map.
    'core/store/hooks',
    'reducers/auth',
    'components/Label/UnitNamesLabels'
  ];
  for (const specifier of specifiers) {
    const typed = ts.resolveModuleName(specifier, importer, parsed.options, ts.sys).resolvedModule;
    const runtime = await server.environments.client.pluginContainer.resolveId(specifier, importer);
    assert.ok(typed, `TypeScript could not resolve ${specifier}`);
    assert.ok(runtime, `Vite could not resolve ${specifier}`);
    assert.equal(path.resolve(typed.resolvedFileName), path.resolve(runtime.id),
      `TypeScript and Vite disagree on ${specifier}`);
  }
  console.log(`Module resolution agrees for ${specifiers.length} representative imports.`);
} finally {
  await server.close();
}
