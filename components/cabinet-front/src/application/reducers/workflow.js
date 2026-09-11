const LOAD_WORKFLOW_SUCCESS = 'LOAD_WORKFLOW_SUCCESS';
const LOAD_WORKFLOW_LOGS_SUCCESS = 'LOAD_WORKFLOW_LOGS_SUCCESS';

const initialState = {
  loading: false,
  actual: {},
  origin: {},
  logs: {}
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOAD_WORKFLOW_SUCCESS: {
      const workflow = action.payload;
      return {
        ...state,
        actual: { ...state.actual, [workflow.id]: workflow },
        origin: {
          ...state.origin,
          [workflow.id]: JSON.parse(JSON.stringify(workflow))
        }
      };
    }
    case LOAD_WORKFLOW_LOGS_SUCCESS: {
      const { workflowId, logs } = action.payload;
      return {
        ...state,
        logs: {
          ...state.logs,
          [workflowId]: logs
        }
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
