import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('resolves the header and app theme to the runtime theme overrides', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    theme: { logoStyles: { src: '/custom-logo.svg', width: 120 } }
  }))));
  const { loadConfig } = await import('helpers/configLoader');
  await loadConfig();
  const { default: theme } = await import('core/theme');
  const { default: bareTheme } = await import('theme');

  expect(theme.logoStyles).toMatchObject({ src: '/custom-logo.svg', width: 120 });
  expect(bareTheme).toBe(theme);
  expect(theme.palette).toBeDefined();
});

it('preserves the cabinet logo defaults without runtime overrides', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
  const { loadConfig } = await import('helpers/configLoader');
  await loadConfig();
  const { default: theme } = await import('core/theme');

  expect(theme.logoStyles.width).toBe(48);
  expect(theme.logoStyles.src).toBeUndefined();
  expect(theme.palette).toBeDefined();
});
