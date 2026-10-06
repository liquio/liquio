interface Action {
  type: string;
  payload?: unknown;
}

interface NumberTemplatesState {
  actual: Record<string, unknown>;
  origin: Record<string, unknown>;
  list: unknown[] | null;
}

const REQUEST_NUMBER_TEMPLATES_SUCCESS = 'REQUEST_NUMBER_TEMPLATES_SUCCESS';
const REQUEST_NUMBER_TEMPLATE_SUCCESS = 'REQUEST_NUMBER_TEMPLATE_SUCCESS';
const UPDATE_NUMBER_TEMPLATE_SUCCESS = 'UPDATE_NUMBER_TEMPLATE_SUCCESS';
const UPDATE_NUMBER_TEMPLATE_DATA = 'UPDATE_NUMBER_TEMPLATE_DATA';
const CLEAR_NEW_NUMBER_TEMPLATE = 'CLEAR_NEW_NUMBER_TEMPLATE';

const initialState: NumberTemplatesState = {
  actual: {
    new: {}
  },
  origin: {
    new: {}
  },
  list: null
};

const rootReducer = (state: NumberTemplatesState = initialState, action: Action): NumberTemplatesState => {
  switch (action.type) {
    case UPDATE_NUMBER_TEMPLATE_SUCCESS:
    case REQUEST_NUMBER_TEMPLATE_SUCCESS: {
      const { id } = action.payload as { id: string | number };

      return {
        ...state,
        actual: {
          ...state.actual,
          [id]: action.payload
        },
        origin: {
          ...state.origin,
          [id]: JSON.parse(JSON.stringify(action.payload))
        }
      };
    }
    case UPDATE_NUMBER_TEMPLATE_DATA: {
      const { id } = action.payload as { id: string | number };

      return {
        ...state,
        actual: {
          ...state.actual,
          [id]: action.payload
        }
      };
    }
    case CLEAR_NEW_NUMBER_TEMPLATE: {
      return {
        ...state,
        actual: {
          ...state.actual,
          new: {}
        }
      };
    }
    case REQUEST_NUMBER_TEMPLATES_SUCCESS: {
      return {
        ...state,
        list: action.payload as unknown[]
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
