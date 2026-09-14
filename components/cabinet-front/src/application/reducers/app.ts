interface AppState {
  openSidebar: boolean;
  openDrawer: boolean;
  uiFilters: unknown;
  sideBarMargin: Record<string, unknown>;
  mainScrollbar: unknown;
  navigationTree: unknown[] | null;
  navigationTreeLoaded: boolean;
  localization?: unknown;
  localizationTexts?: unknown;
  [key: string]: unknown;
}

interface AppAction {
  type: string;
  payload?: unknown;
}

const LARGE_SCREEN_WIDTH = 600;

const SET_OPEN_SIDEBAR = 'APP/SET_OPEN_SIDEBAR';
const SET_OPEN_DAWER = 'APP/SET_OPEN_DAWER';
const SET_SIDEBAR_MARGIN = 'APP/SET_SIDEBAR_MARGIN';
const GET_UI_FILTERS_SUCCESS = 'GET_UI_FILTERS_SUCCESS';
const SET_MAIN_SCROLLBAR = 'APP/SET_MAIN_SCROLLBAR';
const GET_LOCALIZATION_LANG_SUCCESS = 'GET_LOCALIZATION_LANG_SUCCESS';
const GET_LOCALIZATION_TEXT_SUCCESS = 'GET_LOCALIZATION_TEXT_SUCCESS';
const GET_NAVIGATION_TREE_SUCCESS = 'GET_NAVIGATION_TREE_SUCCESS';
const GET_NAVIGATION_TREE_FAIL = 'GET_NAVIGATION_TREE_FAIL';

const initialState: AppState = {
  openSidebar: window.innerWidth > LARGE_SCREEN_WIDTH,
  openDrawer: false,
  uiFilters: null,
  sideBarMargin: {},
  mainScrollbar: null,
  navigationTree: null,
  navigationTreeLoaded: false
};

const rootReducer = (state: AppState = initialState, action: AppAction): AppState => {
  switch (action.type) {
    case SET_OPEN_SIDEBAR:
      return { ...state, openSidebar: action.payload as boolean };
    case SET_OPEN_DAWER:
      return { ...state, openDrawer: action.payload as boolean };
    case GET_UI_FILTERS_SUCCESS:
      return { ...state, uiFilters: action.payload };
    case SET_SIDEBAR_MARGIN:
      return { ...state, sideBarMargin: action.payload as Record<string, unknown> };
    case SET_MAIN_SCROLLBAR: {
      const { scrollbar, ref } = action.payload as { scrollbar: string; ref: unknown };
      return {
        ...state,
        [scrollbar]: ref
      };
    }
    case GET_LOCALIZATION_LANG_SUCCESS:
      return { ...state, localization: action.payload };
    case GET_LOCALIZATION_TEXT_SUCCESS:
      return { ...state, localizationTexts: action.payload };
    case GET_NAVIGATION_TREE_SUCCESS:
      return {
        ...state,
        navigationTree: Array.isArray(action.payload) ? action.payload : null,
        navigationTreeLoaded: true
      };
    case GET_NAVIGATION_TREE_FAIL:
      return {
        ...state,
        navigationTreeLoaded: true
      };
    default:
      return state;
  }
};

export default rootReducer;
