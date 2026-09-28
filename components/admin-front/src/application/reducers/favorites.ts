interface Action {
  type: string;
  payload?: unknown;
  url?: string;
}

interface FavoritesState {
  workflow_templates: unknown[];
  units: unknown[];
  registers: unknown[];
  [key: string]: unknown;
}

const initialState: FavoritesState = {
  workflow_templates: [],
  units: [],
  registers: []
};

const rootReducer = (state: FavoritesState = initialState, action: Action): FavoritesState => {
  switch (action.type) {
    case 'GET_FAVORITES_SUCCESS': {
      const favoritesEntity = (action.url as string).split('/');
      const type = favoritesEntity[favoritesEntity.length - 1];
      return {
        ...state,
        [type]: action.payload
      };
    }
    default:
      return state;
  }
};

export default rootReducer;
