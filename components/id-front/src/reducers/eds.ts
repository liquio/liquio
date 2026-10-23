import type { StoreAction } from '../types/authState';

const REQUEST_EDS_SERVER_LIST_SUCCESS = 'REQUEST_EDS_SERVER_LIST_SUCCESS';
const REQUEST_SIGN_DATA_SUCCESS = 'REQUEST_SIGN_DATA_SUCCESS';

const EDS_CLEAR_TYPES = 'eds/clearTypes';
const EDS_ADD_KM_TYPE = 'eds/addKmType';
const EDS_ADD_KM_DEVICE = 'eds/addKmDevice';
const EDS_LIBRARY_INIT_FAILED = 'eds/libraryInitFailed';
const EDS_INITED = 'eds/libraryInitSuccess';

export interface KmDevice {
  index: unknown;
  name: unknown;
}

export interface KmType {
  name: unknown;
  index: unknown;
  devices: KmDevice[];
}

export interface EdsState {
  kmTypes: KmType[];
  inited: boolean;
  serverList?: unknown;
  dataToSign?: unknown;
  error?: unknown;
}

const initialState: EdsState = {
  kmTypes: [],
  inited: false,
};

const rootReducer = (state: EdsState = initialState, action: StoreAction): EdsState => {
  const { kmTypes } = state;
  switch (action.type) {
    case REQUEST_EDS_SERVER_LIST_SUCCESS:
      return { ...state, serverList: (action.payload as { list: unknown }).list };
    case REQUEST_SIGN_DATA_SUCCESS:
      return { ...state, dataToSign: (action.payload as { token: unknown }).token };
    case EDS_CLEAR_TYPES:
      return { ...state, kmTypes: [] };
    case EDS_ADD_KM_TYPE: {
      const { type, index } = action.payload as { type: unknown; index: number };
      // Mutates the array held by the previous state (a new object around the same array),
      // so `kmTypes` keeps its identity. Preserved as is.
      kmTypes[index] = { name: type, index, devices: [] };
      return { ...state, kmTypes };
    }
    case EDS_ADD_KM_DEVICE: {
      const { device, typeIndex, deviceIndex } = action.payload as {
        device: unknown;
        typeIndex: number;
        deviceIndex: number;
      };
      // Same in-place mutation as above; throws a TypeError when the type at `typeIndex`
      // was never added. Preserved as is.
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
