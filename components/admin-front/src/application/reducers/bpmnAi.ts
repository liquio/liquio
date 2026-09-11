interface Action {
  type: string;
  payload?: unknown;
}

const SET_EXTERNAL_COMMAND = 'AI_SET_EXTERNAL_COMMAND';

interface BpmnAiState {
  externalCommand: string;
}

const initialState: BpmnAiState = {
  externalCommand: ''
};

const rootReducer = (state: BpmnAiState = initialState, action: Action): BpmnAiState => {
  switch (action.type) {
    case SET_EXTERNAL_COMMAND:
      return {
        ...state,
        externalCommand: action.payload as string
      };
    default:
      return state;
  }
};

export default rootReducer;
