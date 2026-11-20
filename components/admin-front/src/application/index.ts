import getModules from 'application/modules';

export const access = { userHasRole: 'admin' };
export const initActions = {};

export const modules = getModules();
export { default as reducers } from 'application/reducers';
export function getInitActions() {
  return {};
}
