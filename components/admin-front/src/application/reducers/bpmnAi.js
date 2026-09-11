const SET_EXTERNAL_COMMAND = 'AI_SET_EXTERNAL_COMMAND';

const initialState = {
  externalCommand: ''
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_EXTERNAL_COMMAND:
      return {
        ...state,
        externalCommand: action.payload
      };
    default:
      return state;
  }
};

export default rootReducer;
