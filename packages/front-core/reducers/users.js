const SEARCH_USERS_SUCCESS = 'SEARCH_USERS_SUCCESS';

const initialState = {};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SEARCH_USERS_SUCCESS: {
      return action.payload.filter(Boolean).reduce(
        (acc, user) => ({
          ...acc,
          [user.userId]: user,
        }),
        state,
      );
    }
    default:
      return state;
  }
};
export default rootReducer;
