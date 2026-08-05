const LARGE_SCREEN_WIDTH = 600;

const SET_OPEN_SIDEBAR = 'APP/SET_OPEN_SIDEBAR';
const SET_OPEN_DAWER = 'APP/SET_OPEN_DAWER';
const SET_SIDEBAR_MARGIN = 'APP/SET_SIDEBAR_MARGIN';
const GET_UI_FILTERS_SUCCESS = 'GET_UI_FILTERS_SUCCESS';
const SET_MAIN_SCROLLBAR = 'APP/SET_MAIN_SCROLLBAR';
const GET_LOCALIZATION_LANG_SUCCESS = 'GET_LOCALIZATION_LANG_SUCCESS';
const GET_LOCALIZATION_TEXT_SUCCESS = 'GET_LOCALIZATION_TEXT_SUCCESS';

const initialState = {
  openSidebar: window.innerWidth > LARGE_SCREEN_WIDTH,
  openDrawer: false,
  uiFilters: null,
  sideBarMargin: {},
  mainScrollbar: null
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_OPEN_SIDEBAR:
      return { ...state, openSidebar: action.payload };
    case SET_OPEN_DAWER:
      return { ...state, openDrawer: action.payload };
    case GET_UI_FILTERS_SUCCESS:
      return { ...state, uiFilters: action.payload };
    case SET_SIDEBAR_MARGIN:
      return { ...state, sideBarMargin: action.payload };
    case SET_MAIN_SCROLLBAR:
      return {
        ...state,
        [action.payload.scrollbar]: action.payload.ref
      };
    case GET_LOCALIZATION_LANG_SUCCESS:
      return { ...state, localization: action.payload };
    case GET_LOCALIZATION_TEXT_SUCCESS:
      return { ...state, localizationTexts: action.payload };
    default:
      return state;
  }
};

export default rootReducer;
