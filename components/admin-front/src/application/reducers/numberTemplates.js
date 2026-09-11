const REQUEST_NUMBER_TEMPLATES_SUCCESS = 'REQUEST_NUMBER_TEMPLATES_SUCCESS';
const REQUEST_NUMBER_TEMPLATE_SUCCESS = 'REQUEST_NUMBER_TEMPLATE_SUCCESS';
const UPDATE_NUMBER_TEMPLATE_SUCCESS = 'UPDATE_NUMBER_TEMPLATE_SUCCESS';
const UPDATE_NUMBER_TEMPLATE_DATA = 'UPDATE_NUMBER_TEMPLATE_DATA';
const CLEAR_NEW_NUMBER_TEMPLATE = 'CLEAR_NEW_NUMBER_TEMPLATE';

const initialState = {
  actual: {
    new: {},
  },
  origin: {
    new: {},
  },
  list: null,
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_NUMBER_TEMPLATE_SUCCESS:
    case REQUEST_NUMBER_TEMPLATE_SUCCESS: {
      const { id } = action.payload;

      return {
        ...state,
        actual: {
          ...state.actual,
          [id]: action.payload,
        },
        origin: {
          ...state.origin,
          [id]: JSON.parse(JSON.stringify(action.payload)),
        },
      };
    }
    case UPDATE_NUMBER_TEMPLATE_DATA: {
      const { id } = action.payload;

      return {
        ...state,
        actual: {
          ...state.actual,
          [id]: action.payload,
        },
      };
    }
    case CLEAR_NEW_NUMBER_TEMPLATE: {
      return {
        ...state,
        actual: {
          ...state.actual,
          new: {},
        },
      };
    }
    case REQUEST_NUMBER_TEMPLATES_SUCCESS: {
      return {
        ...state,
        list: action.payload,
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
