const LOAD_DOCUMENT_TEMPLATE_SUCCESS = 'LOAD_DOCUMENT_TEMPLATE_SUCCESS';
const LOAD_DOCUMENT_TEMPLATES_SUCCESS = 'LOAD_DOCUMENT_TEMPLATES_SUCCESS';
const LOAD_TASK_TEMPLATES_SUCCESS = 'LOAD_TASK_TEMPLATES_SUCCESS';

const initialState = {
  loading: false,
  list: null,
  actual: {}
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOAD_DOCUMENT_TEMPLATE_SUCCESS:
      const template = action.payload;

      return {
        ...state,
        actual: {
          ...state.actual,
          [template.id]: template
        }
      };
    case LOAD_DOCUMENT_TEMPLATES_SUCCESS:
      return {
        ...state,
        list: action.payload
      };
    case LOAD_TASK_TEMPLATES_SUCCESS:
      const taskTemplate = action.payload;

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
    default:
      return state;
  }
};

export default rootReducer;
