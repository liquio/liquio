const initialState = {
  workflow_templates: [],
  units: [],
  registers: [],
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'GET_FAVORITES_SUCCESS': {
      const favoritesEntity = action.url.split('/');
      const type = favoritesEntity[favoritesEntity.length - 1];
      return {
        ...state,
        [type]: action.payload,
      };
    }
    default:
      return state;
  }
};

export default rootReducer;
