/**
 * Minimal logging contract plugins and the loader depend on.
 */
export interface PluginLogger {
  save(type: string, data?: unknown, level?: string): unknown;
}
