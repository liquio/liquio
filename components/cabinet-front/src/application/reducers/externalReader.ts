interface ExternalReaderState {
  captcha?: unknown;
  [key: string]: unknown;
}

interface ExternalReaderAction {
  type: string;
  payload?: unknown;
  request?: { requestData?: unknown };
}

const REQUEST_EXTERNAL_DATA_SUCCESS = 'REQUEST_EXTERNAL_DATA_SUCCESS';
const GET_DATA_EXTERNAL_REGISTER_READER_LIST = 'GET_DATA_EXTERNAL_REGISTER_READER_LIST_SUCCESS';

const initialState: ExternalReaderState = {};

export default (
  state: ExternalReaderState = initialState,
  action: ExternalReaderAction
): ExternalReaderState => {
  switch (action.type) {
    case GET_DATA_EXTERNAL_REGISTER_READER_LIST: {
      return {
        ...state,
        captcha: action.payload
      };
    }
    case REQUEST_EXTERNAL_DATA_SUCCESS: {
      const { requestData } = action.request as { requestData?: unknown };

      return {
        ...state,
        [JSON.stringify(requestData)]: action.payload
      };
    }
    default:
      return state;
  }
};
