const REQUEST_SNIPPETS_SUCCESS = 'REQUEST_SNIPPETS_SUCCESS';
const REQUEST_SNIPPETS_FAIL = 'REQUEST_SNIPPETS_FAIL';
const GET_SNIPPET_GROUPS_SUCCESS = 'GET_SNIPPET_GROUPS_SUCCESS';
const GET_SNIPPET_GROUPS_FAIL = 'GET_SNIPPET_GROUPS_FAIL';

const initialState = {
  snippets: [],
  groups: [],
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case REQUEST_SNIPPETS_SUCCESS: {
      return {
        ...state,
        snippets: Array.isArray(action.payload) ? action.payload : [],
      };
    }
    case REQUEST_SNIPPETS_FAIL: {
      return {
        ...state,
        snippets: [],
      };
    }
    case GET_SNIPPET_GROUPS_SUCCESS: {
      return {
        ...state,
        groups: Array.isArray(action.payload) ? action.payload : [],
      };
    }
    case GET_SNIPPET_GROUPS_FAIL: {
      return {
        ...state,
        groups: [],
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
