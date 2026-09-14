interface Workflow {
  id: string | number;
  [key: string]: unknown;
}

interface WorkflowState {
  loading: boolean;
  actual: Record<string, Workflow>;
  origin: Record<string, Workflow>;
  logs: Record<string, unknown>;
}

interface WorkflowAction {
  type: string;
  payload?: unknown;
}

const LOAD_WORKFLOW_SUCCESS = 'LOAD_WORKFLOW_SUCCESS';
const LOAD_WORKFLOW_LOGS_SUCCESS = 'LOAD_WORKFLOW_LOGS_SUCCESS';

const initialState: WorkflowState = {
  loading: false,
  actual: {},
  origin: {},
  logs: {}
};

const rootReducer = (state: WorkflowState = initialState, action: WorkflowAction): WorkflowState => {
  switch (action.type) {
    case LOAD_WORKFLOW_SUCCESS: {
      const workflow = action.payload as Workflow;
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
      const { workflowId, logs } = action.payload as { workflowId: string | number; logs: unknown };
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
