import { useSelector, useDispatch } from 'react-redux';

import * as api from 'services/api';

const DEFAULT_SETTINGS: Record<string, unknown> = {};

export const useUserSettings = (part?: string, defaults: Record<string, unknown> = {}) => {
  const dispatch = useDispatch();

  const state = useSelector(({ auth: { settings = DEFAULT_SETTINGS } }: { auth: { settings?: Record<string, unknown> } }) => settings);

  const setSettings = (settings: unknown) => {
    const newState = part ? { ...state, [part]: settings } : settings;
    api.post('user-settings', newState, 'SET_USER_SETTINGS', dispatch as never);
  }

  return {
    settings: {
      ...defaults,
      ...((part ? state[part] : state) || DEFAULT_SETTINGS)
    },
    setSettings,
  };
}
