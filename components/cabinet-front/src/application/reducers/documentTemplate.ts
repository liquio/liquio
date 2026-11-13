interface DocumentTemplate {
  id: string | number;
  [key: string]: unknown;
}

interface TaskTemplate {
  id: string | number;
  jsonSchema?: unknown;
  [key: string]: unknown;
}

interface DocumentTemplateState {
  loading: boolean;
  list: unknown[] | null;
  actual: Record<string, DocumentTemplate | { taskTemplate?: unknown; [key: string]: unknown }>;
}

interface DocumentTemplateAction {
  type: string;
  payload?: unknown;
}

const LOAD_DOCUMENT_TEMPLATE_SUCCESS = 'LOAD_DOCUMENT_TEMPLATE_SUCCESS';
const LOAD_DOCUMENT_TEMPLATES_SUCCESS = 'LOAD_DOCUMENT_TEMPLATES_SUCCESS';
const LOAD_TASK_TEMPLATES_SUCCESS = 'LOAD_TASK_TEMPLATES_SUCCESS';

const initialState: DocumentTemplateState = {
  loading: false,
  list: null,
  actual: {}
};

const rootReducer = (
  state: DocumentTemplateState = initialState,
  action: DocumentTemplateAction
): DocumentTemplateState => {
  switch (action.type) {
    case LOAD_DOCUMENT_TEMPLATE_SUCCESS: {
      const template = action.payload as DocumentTemplate;

      return {
        ...state,
        actual: {
          ...state.actual,
          [template.id]: template
        }
      };
    }
    case LOAD_DOCUMENT_TEMPLATES_SUCCESS:
      return {
        ...state,
        list: action.payload as unknown[]
      };
    case LOAD_TASK_TEMPLATES_SUCCESS: {
      const taskTemplate = action.payload as TaskTemplate;

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskTemplate.id]: {
            ...state.actual[taskTemplate.id],
            taskTemplate: taskTemplate.jsonSchema
          }
        }
      };
    }
    default:
      return state;
  }
};

export default rootReducer;
