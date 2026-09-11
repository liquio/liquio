let config = null;

/**
 * Load configuration from /config.json at runtime
 */
export async function loadConfig(defaults = {}) {
  // If already loaded, return cached merged config
  if (config) {
    return config;
  }

  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    config = await response.json();
  } catch (error) {
    console.error('Failed to load configuration:', error);
  }

  // Shallow merge first
  const merged = { ...defaults, ...(config || {}) };

  // Ensure nested objects preserve defaults (at least for `application`)
  merged.application = { ...(defaults?.application || {}), ...(config?.application || {}) };

  config = merged;
  return config;
}

/**
 * Get current configuration (must call loadConfig first)
 */
export function getConfig() {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}
