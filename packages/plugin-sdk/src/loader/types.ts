export interface PluginConfigEntry {
  package: string;
  version: string;
  isEnabled: boolean;
  name: string;
  options?: Record<string, unknown>;
}

export interface PluginsConfig {
  pluginsDir: string;
  plugins: PluginConfigEntry[];
}
