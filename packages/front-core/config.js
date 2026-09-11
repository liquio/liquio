import { getConfig } from 'helpers/configLoader';

const appConfig = new Proxy(
  {},
  {
    get(_, prop) {
      try {
        return getConfig()[prop];
      } catch {
        return undefined;
      }
    },
    has(_, prop) {
      try {
        return prop in getConfig();
      } catch {
        return false;
      }
    },
    ownKeys() {
      try {
        return Reflect.ownKeys(getConfig());
      } catch {
        return [];
      }
    },
    getOwnPropertyDescriptor(_, prop) {
      try {
        return Object.getOwnPropertyDescriptor(getConfig(), prop);
      } catch {
        return undefined;
      }
    }
  }
);

export default appConfig;
