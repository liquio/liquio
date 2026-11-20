interface Action {
  type: string;
  payload?: unknown;
  request?: { registerId?: string | number };
}

type RegistryState = Record<string, unknown>;

const GET_REGISTERS_KEYS_SUCCESS = 'GET_REGISTERS_KEYS_SUCCESS';

const initialState: RegistryState = {};

const rootReducer = (state: RegistryState = initialState, action: Action): RegistryState => {
  switch (action.type) {
    case GET_REGISTERS_KEYS_SUCCESS: {
      const { registerId } = action.request as { registerId: string | number };
      return {
        ...state,
        [registerId]: action.payload
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
