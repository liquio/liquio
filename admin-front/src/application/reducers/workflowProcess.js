const initialState = {
  list: {},
  attaches: {},
};

const REQUEST_WORKFLOW_PROCESS_SUCCESS = 'REQUEST_WORKFLOW_PROCESS_SUCCESS';
const REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED =
  'REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED';

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case REQUEST_WORKFLOW_PROCESS_SUCCESS: {
      const { processId } = action.request;

      return {
        ...state,
        list: {
          ...state.list,
          [processId]: action.payload,
        },
      };
    }
    case REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED: {
      const { id, payload } = action;

      return {
        ...state,
        attaches: {
          ...state.attaches,
          [id]: payload,
        },
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
