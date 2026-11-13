import type { AuthResponse } from '../types/auth';
import type { AuthState, StoreAction } from '../types/authState';

const initialState: AuthState = { DBError: false, ERROR_503: false };
const GET_AUTH_SUCCESS = 'GET_AUTH_SUCCESS';
const GET_AUTH_FAIL = 'GET_AUTH_FAIL';
const DB_ERROR = 'DB_ERROR';
const ERROR_503 = 'ERROR_503';

const rootReducer = (state: AuthState = initialState, action: StoreAction): AuthState => {
  switch (action.type) {
    case GET_AUTH_SUCCESS:
      // The payload is merged as is, whatever the backend returned.
      return { ...state, ...(action.payload as AuthResponse), DBError: false };
    case GET_AUTH_FAIL:
    case DB_ERROR:
      return { ...state, DBError: true };
    case ERROR_503:
      return { ...state, ERROR_503: action.payload as boolean };
    default:
      return state;
  }
};
export default rootReducer;
