const SET_CHECK_HIDDEN_FUNC = 'SET_CHECK_HIDDEN_FUNC';
const SET_CHECK_VALID_FUNC = 'SET_CHECK_VALID_FUNC';
const SET_POPUP_DATA = 'DEBUG_TOOLS/SET_POPUP_DATA';
const SET_CUSTOM_INTERFACE_DATA = 'DEBUG_TOOLS/SET_CUSTOM_INTERFACE_DATA';

const initialState = {
  checkValidFuncs: {},
  checkHiddenFuncs: {},
  popup: null,
  customInterface: null,
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CHECK_HIDDEN_FUNC: {
      const { taskId, func } = action.payload;
      return {
        ...state,
        checkHiddenFuncs: {
          ...state.checkHiddenFuncs,
          [taskId]: func,
        },
      };
    }
    case SET_CHECK_VALID_FUNC: {
      const { taskId, func } = action.payload;
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
