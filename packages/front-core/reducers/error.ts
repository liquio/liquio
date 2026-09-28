interface ErrorState {
  list: unknown[];
  serviceMessage: unknown;
}

interface ErrorAction {
  type: string;
  payload?: unknown;
}

const ON_ERROR_ADD = 'ON_ERROR_ADD';
const ON_MESSAGE_ADD = 'ON_MESSAGE_ADD';
const ON_ERROR_CLOSE = 'ON_ERROR_CLOSE';
const SHOW_SERVICE_MESSAGE = 'SHOW_SERVICE_MESSAGE';

const initialState: ErrorState = {
  list: [],
  serviceMessage: null,
};

const rootReducer = (state: ErrorState = initialState, action: ErrorAction): ErrorState => {
  switch (action.type) {
    case ON_ERROR_ADD:
    case ON_MESSAGE_ADD:
      return { ...state, list: state.list.concat([action.payload]) };
    case ON_ERROR_CLOSE:
      return {
        ...state,
        list: state.list.filter(
          (error, index) =>
            index !== action.payload && (error as { id?: unknown })?.id !== action.payload,
        ),
      };
    case SHOW_SERVICE_MESSAGE: {
      return {
        ...state,
        serviceMessage: action.payload,
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
