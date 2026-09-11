const initialState = {
  registers: null,
  keys: null,
  records: {},
  keyRecords: {},
  relatedRecords: {},
  customData: {},
  history: {}
};

const REQUEST_CUSTOM_DATA_SUCCESS = 'REGISTRY/REQUEST_CUSTOM_DATA_SUCCESS';
const REQUEST_REGISTERS_SUCCESS = 'REGISTRY/REQUEST_REGISTERS_SUCCESS';
const REQUEST_REGISTER_KEYS_SUCCESS = 'REGISTRY/REQUEST_REGISTER_KEYS_SUCCESS';
const REQUEST_REGISTER_RELATED_KEY_RECORDS_SUCCESS = 'REQUEST_REGISTER_RELATED_KEY_RECORDS_SUCCESS';
const REQUEST_REGISTER_KEY_RECORD_SUCCESS = 'REGISTRY/REQUEST_REGISTER_KEY_RECORD_SUCCESS';

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case REQUEST_REGISTERS_SUCCESS:
      return { ...state, registers: action.payload };
    case REQUEST_REGISTER_KEYS_SUCCESS:
      return { ...state, keys: action.payload };
    case REQUEST_REGISTER_RELATED_KEY_RECORDS_SUCCESS: {
      const {
        request: { keyIds }
      } = action;

      return {
        ...state,
        relatedRecords: {
          ...state.relatedRecords,
          [keyIds]: action.payload
        }
      };
    }
    case REQUEST_REGISTER_KEY_RECORD_SUCCESS: {
      const { id } = action.payload;

      return {
        ...state,
        records: {
          ...state.records,
          [id]: action.payload
        }
      };
    }
    case REQUEST_CUSTOM_DATA_SUCCESS: {
      const { handler } = action.request;

      return {
        ...state,
        customData: {
          ...state.customData,
          [handler]: action.payload
        }
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
