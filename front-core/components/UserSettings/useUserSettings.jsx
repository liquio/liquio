import { useSelector, useDispatch } from 'react-redux';

import * as api from 'services/api';

const DEFAULT_SETTINGS = {};

export const useUserSettings = (part, defaults = {}) => {
  const dispatch = useDispatch();

  const state = useSelector(({ auth: { settings = DEFAULT_SETTINGS } }) => settings);

  const setSettings = (settings) => {
    const newState = part ? { ...state, [part]: settings } : settings;
    api.post('user-settings', newState, 'SET_USER_SETTINGS', dispatch);
  }

  return {
    settings: {
      ...defaults,
      ...((part ? state[part] : state) || DEFAULT_SETTINGS)
    },
    setSettings,
  };
}