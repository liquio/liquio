const LOAD_WORKFLOW_TEMPLATE_SUCCESS = 'LOAD_WORKFLOW_TEMPLATE_SUCCESS';
const LOAD_WORKFLOW_TEMPLATES_SUCCESS = 'LOAD_WORKFLOW_TEMPLATES_SUCCESS';
const LOAD_WORKFLOW_CATEGORIES_SUCCESS = 'LOAD_WORKFLOW_CATEGORIES_SUCCESS';
const LOAD_WORKFLOW_STATUSES_SUCCESS = 'LOAD_WORKFLOW_STATUSES_SUCCESS';

const initialState = {
  loading: false,
  list: null,
  categories: null,
  actual: {},
  statuses: null
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOAD_WORKFLOW_TEMPLATE_SUCCESS:
      const template = action.payload;
      return { ...state, actual: { ...state.actual, [template.id]: template } };
    case LOAD_WORKFLOW_TEMPLATES_SUCCESS:
      return { ...state, list: action.payload };
    case LOAD_WORKFLOW_CATEGORIES_SUCCESS:
      return { ...state, categories: action.payload };
    case LOAD_WORKFLOW_STATUSES_SUCCESS:
      return { ...state, statuses: action.payload };
    default:
      return state;
  }
};
export default rootReducer;
