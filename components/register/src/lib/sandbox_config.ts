/**
 * Build the Sandbox config. Template JavaScript must never run outside isolated-vm, so the isolation level is not
 * configurable: a configured `function` level (host-realm `new Function`) is overridden and reported.
 * @param {Record<string, any>} [sandboxConfig] The `sandbox` section of the config.
 * @param {(message: string) => void} [warn] Warning writer.
 * @returns {Record<string, any>} Sandbox config with a forced isolation level.
 */
export function buildSandboxConfig(
  sandboxConfig: Record<string, any> = {},
  warn: (message: string) => void = (message) => console.warn(message),
): Record<string, any> {
  const requested = sandboxConfig?.isolationLevel;
  if (requested !== undefined && requested !== 'isolated-vm') {
    warn(`sandbox-unsafe-function-level: sandbox.isolationLevel "${requested}" is not supported, using "isolated-vm"`);
  }

  return { ...sandboxConfig, isolationLevel: 'isolated-vm' };
}
