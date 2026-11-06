import _ from 'lodash/fp';

import bpmn from './bpmn';

const themes: { [name: string]: typeof bpmn | undefined } = {
  bpmn,
};

const getTheme = (config?: { APP_NAME?: string } | null) => {
  const themeName = (config?.APP_NAME || 'bpmn').toLowerCase();
  const currentTheme = themes[themeName] || {};
  return _.merge(themes.bpmn, currentTheme);
};

// The pre-Vite (CRA) build did `require('helpers/configLoader')` here and returned
// `getTheme(getConfig())`. `require` does not exist in a Vite bundle, so that call always
// threw a ReferenceError and the catch fell back to `themes.bpmn`; that is the behavior the
// app has had since Phase 0. `bpmn` is the only theme, so `getTheme(config)` would return a
// copy equal in content to `bpmn` for any config. The dead CRA path is dropped, and the default
// export stays the `bpmn` object itself, as it is today. A static `import { getConfig }` would
// only change the identity (a lodash/fp clone), and would make this module depend on the
// config having been loaded.
const getDefaultTheme = () => themes.bpmn as typeof bpmn;

export { getTheme };
export default getDefaultTheme();
