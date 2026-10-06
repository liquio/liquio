interface WorkflowTemplate {
  id: string | number;
  [key: string]: unknown;
}

interface WorkflowTemplateState {
  loading: boolean;
  list: unknown[] | null;
  categories: unknown[] | null;
  actual: Record<string, WorkflowTemplate>;
  statuses: unknown[] | null;
}

interface WorkflowTemplateAction {
  type: string;
  payload?: unknown;
}

const LOAD_WORKFLOW_TEMPLATE_SUCCESS = 'LOAD_WORKFLOW_TEMPLATE_SUCCESS';
const LOAD_WORKFLOW_TEMPLATES_SUCCESS = 'LOAD_WORKFLOW_TEMPLATES_SUCCESS';
const LOAD_WORKFLOW_CATEGORIES_SUCCESS = 'LOAD_WORKFLOW_CATEGORIES_SUCCESS';
const LOAD_WORKFLOW_STATUSES_SUCCESS = 'LOAD_WORKFLOW_STATUSES_SUCCESS';

const initialState: WorkflowTemplateState = {
  loading: false,
  list: null,
  categories: null,
  actual: {},
  statuses: null
};

const rootReducer = (
  state: WorkflowTemplateState = initialState,
  action: WorkflowTemplateAction
): WorkflowTemplateState => {
  switch (action.type) {
    case LOAD_WORKFLOW_TEMPLATE_SUCCESS: {
      const template = action.payload as WorkflowTemplate;
      return { ...state, actual: { ...state.actual, [template.id]: template } };
    }
    case LOAD_WORKFLOW_TEMPLATES_SUCCESS:
      return { ...state, list: action.payload as unknown[] };
    case LOAD_WORKFLOW_CATEGORIES_SUCCESS:
      return { ...state, categories: action.payload as unknown[] };
    case LOAD_WORKFLOW_STATUSES_SUCCESS:
      return { ...state, statuses: action.payload as unknown[] };
    default:
      return state;
  }
};
export default rootReducer;
