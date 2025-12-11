const SET_EXTERNAL_COMMAND = 'AI_SET_EXTERNAL_COMMAND';
const SET_COPILOT_STATUS = 'AI_SET_COPILOT_STATUS';

const initialState = {
  externalCommand: '',
  copilot: {
    active: JSON.parse(localStorage.getItem('copilotActive')) ?? true,
  },
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_EXTERNAL_COMMAND:
      return {
        ...state,
        externalCommand: action.payload,
      };
    case SET_COPILOT_STATUS:
      localStorage.setItem('copilotActive', JSON.stringify(action.payload));
      return {
        ...state,
        copilot: { active: action.payload },
      };
    default:
      return state;
  }
};

export default rootReducer;
