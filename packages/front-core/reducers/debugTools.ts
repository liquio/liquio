interface DebugToolsState {
  checkValidFuncs: Record<string, unknown>;
  checkHiddenFuncs: Record<string, unknown>;
  popup: unknown;
  customInterface: unknown;
}

interface DebugToolsAction {
  type: string;
  payload?: unknown;
}

const SET_CHECK_HIDDEN_FUNC = 'SET_CHECK_HIDDEN_FUNC';
const SET_CHECK_VALID_FUNC = 'SET_CHECK_VALID_FUNC';
const SET_POPUP_DATA = 'DEBUG_TOOLS/SET_POPUP_DATA';
const SET_CUSTOM_INTERFACE_DATA = 'DEBUG_TOOLS/SET_CUSTOM_INTERFACE_DATA';

const initialState: DebugToolsState = {
  checkValidFuncs: {},
  checkHiddenFuncs: {},
  popup: null,
  customInterface: null,
};

const rootReducer = (state: DebugToolsState = initialState, action: DebugToolsAction): DebugToolsState => {
  switch (action.type) {
    case SET_CHECK_HIDDEN_FUNC: {
      const { taskId, func } = action.payload as { taskId: string | number; func: unknown };
      return {
        ...state,
        checkHiddenFuncs: {
          ...state.checkHiddenFuncs,
          [taskId]: func,
        },
      };
    }
    case SET_CHECK_VALID_FUNC: {
      const { taskId, func } = action.payload as { taskId: string | number; func: unknown };
      return {
        ...state,
        checkValidFuncs: {
          ...state.checkValidFuncs,
          [taskId]: func,
        },
      };
    }
    case SET_POPUP_DATA: {
      return {
        ...state,
        popup: action.payload,
      };
    }
    case SET_CUSTOM_INTERFACE_DATA: {
      return {
        ...state,
        customInterface: action.payload,
      };
    }

    default:
      return state;
  }
};

export default rootReducer;
