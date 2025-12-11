const GET_REGISTERS_KEYS_SUCCESS = 'GET_REGISTERS_KEYS_SUCCESS';

const initialState = {};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_REGISTERS_KEYS_SUCCESS: {
      const { registerId } = action.request;
      return {
        ...state,
        [registerId]: action.payload,
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
