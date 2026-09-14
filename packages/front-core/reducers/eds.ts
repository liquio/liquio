interface KmDevice {
  index: number;
  name: string;
}

interface KmType {
  name: string;
  index: number;
  devices: KmDevice[];
}

interface EdsState {
  kmTypes: KmType[];
  inited: boolean;
  error?: unknown;
}

interface EdsAction {
  type: string;
  payload?: unknown;
}

const EDS_CLEAR_TYPES = 'eds/clearTypes';
const EDS_ADD_KM_TYPE = 'eds/addKmType';
const EDS_ADD_KM_DEVICE = 'eds/addKmDevice';
const EDS_LIBRARY_INIT_FAILED = 'eds/libraryInitFailed';
const EDS_INITED = 'eds/libraryInitSuccess';

const initialState: EdsState = {
  kmTypes: [],
  inited: false,
};

const rootReducer = (state: EdsState = initialState, action: EdsAction): EdsState => {
  const { kmTypes } = state;
  switch (action.type) {
    case EDS_CLEAR_TYPES:
      return { ...state, kmTypes: [] };
    case EDS_ADD_KM_TYPE: {
      const { type, index } = action.payload as { type: string; index: number };
      // Note: mutates `state.kmTypes` in place (same array reference) before
      // returning it under a new top-level object — preserved as-is.
      kmTypes[index] = { name: type, index, devices: [] };
      return { ...state, kmTypes };
    }
    case EDS_ADD_KM_DEVICE: {
      const { device, typeIndex, deviceIndex } = action.payload as {
        device: string;
        typeIndex: number;
        deviceIndex: number;
      };
      // Note: mutates `state.kmTypes[typeIndex].devices` in place — preserved as-is.
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
