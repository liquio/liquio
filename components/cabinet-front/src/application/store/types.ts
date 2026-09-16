import type { ThunkDispatch } from 'redux-thunk';
import type reducers from '../reducers';
import type { StateFromReducerMap } from 'core/store/stateTypes';
import type { StoreAction } from 'core/types/authState';

export type RootState = StateFromReducerMap<typeof reducers>;
export type AppDispatch = ThunkDispatch<RootState, undefined, StoreAction>;
