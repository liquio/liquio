interface Action {
  type: string;
  payload?: unknown;
  request?: { processId?: string | number };
  id?: string | number;
}

interface WorkflowProcessState {
  list: Record<string, unknown>;
  attaches: Record<string, unknown>;
}

const initialState: WorkflowProcessState = {
  list: {},
  attaches: {}
};

const REQUEST_WORKFLOW_PROCESS_SUCCESS = 'REQUEST_WORKFLOW_PROCESS_SUCCESS';
const REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED = 'REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED';

const rootReducer = (state: WorkflowProcessState = initialState, action: Action): WorkflowProcessState => {
  switch (action.type) {
    case REQUEST_WORKFLOW_PROCESS_SUCCESS: {
      const { processId } = action.request as { processId: string | number };

      return {
        ...state,
        list: {
          ...state.list,
          [processId]: action.payload
        }
      };
    }
    case REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED: {
      const { id, payload } = action;

      return {
        ...state,
        attaches: {
          ...state.attaches,
          [id as string | number]: payload
        }
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
