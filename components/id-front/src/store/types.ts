import type { AnyAction, Dispatch } from 'redux';
import type rootReducer from '../reducers';

export type RootState = ReturnType<typeof rootReducer>;

/** There is no thunk middleware, so dispatch only takes plain actions. */
export type AppDispatch = Dispatch<AnyAction>;
