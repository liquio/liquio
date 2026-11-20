import { combineReducers, AnyAction } from 'redux';

import reducers from 'reducers';

const RESET_STATE = 'APP/RESET_STATE';

const clearState = ({ app, auth, eds }: Record<string, unknown>) => ({ app, auth, eds });

export default (state: Record<string, unknown> | undefined, action: AnyAction) => {
  if (action.type === RESET_STATE) {
    state = clearState(state as Record<string, unknown>);
  }
  return combineReducers(reducers)(state as never, action);
};
