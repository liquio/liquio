const EDS_CLEAR_TYPES = 'eds/clearTypes';
const EDS_ADD_KM_TYPE = 'eds/addKmType';
const EDS_ADD_KM_DEVICE = 'eds/addKmDevice';
const EDS_LIBRARY_INIT_FAILED = 'eds/libraryInitFailed';
const EDS_INITED = 'eds/libraryInitSuccess';

const initialState = {
  kmTypes: [],
  inited: false,
};

const rootReducer = (state = initialState, action) => {
  const { kmTypes } = state;
  switch (action.type) {
    case EDS_CLEAR_TYPES:
      return { ...state, kmTypes: [] };
    case EDS_ADD_KM_TYPE: {
      const { type, index } = action.payload;
      kmTypes[index] = { name: type, index, devices: [] };
      return { ...state, kmTypes };
    }
    case EDS_ADD_KM_DEVICE: {
      const { device, typeIndex, deviceIndex } = action.payload;
      kmTypes[typeIndex].devices[deviceIndex] = {
        index: deviceIndex,
        name: device,
      };
      return { ...state, kmTypes };
    }
    case EDS_INITED: {
      return { ...state, inited: true };
    }
    case EDS_LIBRARY_INIT_FAILED:
      return { ...state, inited: true, error: action.payload };
    default:
      return state;
  }
};
export default rootReducer;
