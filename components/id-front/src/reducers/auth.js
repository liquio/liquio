const initialState = { DBError: false, ERROR_503: false };
const GET_AUTH_SUCCESS = 'GET_AUTH_SUCCESS';
const GET_AUTH_FAIL = 'GET_AUTH_FAIL';
const DB_ERROR = 'DB_ERROR';
const ERROR_503 = 'ERROR_503';

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_AUTH_SUCCESS:
      return { ...state, ...action.payload, DBError: false };
    case GET_AUTH_FAIL:
    case DB_ERROR:
      return { ...state, DBError: true };
    case ERROR_503:
      return { ...state, ERROR_503: action.payload };
    default:
      return state;
  }
};
export default rootReducer;
