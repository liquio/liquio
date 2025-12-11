import { getUIFilters } from 'actions/app';
import { getUnreadInboxCount } from './actions/inbox';
import { getUnreadMessageCount } from './actions/messages';
import { getMyUnreadTaskCount, getUnitUnreadTaskCount } from './actions/task';
import { getConfig } from '../core/helpers/configLoader';

export const access = null;

export function getInitActions() {
  const config = getConfig();

  return {
    ...(config.useUIFilters ? { getUIFilters } : {}),
    getUnreadInboxCount,
    getUnreadMessageCount,
    getMyUnreadTaskCount,
    getUnitUnreadTaskCount
  };
}

export { default as getModules } from 'modules/index';

export { default as reducers } from 'reducers';
