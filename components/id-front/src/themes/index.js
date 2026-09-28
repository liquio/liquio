import _ from 'lodash/fp';

import bpmn from './bpmn.js';

const themes = {
  bpmn,
};

const getTheme = (config) => {
  const themeName = (config?.APP_NAME || 'bpmn').toLowerCase();
  const currentTheme = themes[themeName] || {};
  return _.merge(themes.bpmn, currentTheme);
};

// For backward compatibility, try to get config if available
let cachedTheme = null;
const getDefaultTheme = () => {
  if (!cachedTheme) {
    try {
      const { getConfig } = require('helpers/configLoader');
      const config = getConfig();
      cachedTheme = getTheme(config);
    } catch (e) {
      // Fallback to default theme if config not available
      cachedTheme = themes.bpmn;
    }
  }
  return cachedTheme;
};

export { getTheme };
export default getDefaultTheme();
