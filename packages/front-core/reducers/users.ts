interface User {
  userId: string | number;
  [key: string]: unknown;
}

type UsersState = Record<string, User>;

interface UsersAction {
  type: string;
  payload?: User[];
}

const SEARCH_USERS_SUCCESS = 'SEARCH_USERS_SUCCESS';

interface SearchUsersSuccessAction {
  type: typeof SEARCH_USERS_SUCCESS;
  payload: User[];
}

const initialState: UsersState = {};

const rootReducer = (state: UsersState = initialState, action: UsersAction): UsersState => {
  switch (action.type) {
    case SEARCH_USERS_SUCCESS: {
      return (action as SearchUsersSuccessAction).payload.filter(Boolean).reduce(
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
