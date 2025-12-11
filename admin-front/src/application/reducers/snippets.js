const REQUEST_SNIPPETS_SUCCESS = 'REQUEST_SNIPPETS_SUCCESS';
const GET_SNIPPET_GROUPS_SUCCESS = 'GET_SNIPPET_GROUPS_SUCCESS';

const initialState = {
  snippets: [],
  groups: [],
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case REQUEST_SNIPPETS_SUCCESS: {
      return {
        ...state,
        snippets: action.payload,
      };
    }
    case GET_SNIPPET_GROUPS_SUCCESS: {
      return {
        ...state,
        groups: action.payload,
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
