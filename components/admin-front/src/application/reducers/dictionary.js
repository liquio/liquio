const initialState = {
  controls: {
    list: null,
    map: {}
  },
}

export default function dictionaryReducer(state = initialState, action) {
  switch (action.type) {
    case 'DICTIONARY/LOAD_CONTROLS_SUCCESS':
      return {
        ...state,
        controls: {
          ...state.controls,
          list: Array.isArray(action.payload) ? [...action.payload] : [],
        }
      };
    case 'DICTIONARY/LOAD_CONTROLS_FAIL':
      return {
        ...state,
        controls: {
          ...state.controls,
          list: [],
        }
      };
    case 'DICTIONARY/LOAD_CONTROL_CONTENTS_SUCCESS':
      const contents = Array.isArray(action.payload) ? [...action.payload] : [];
      const { key, control } = action.request;
      return {
        ...state,
        controls: {
          ...state.controls,
          list: [...(state.controls.list || []), control],
          map: {
            ...state.controls.map,
            [[control, key].join('.')]: contents
          }
        }
      };
    default:
      return state;
  }
}
