import gatewayElementTypes from 'application/modules/workflow/variables/gatewayElementTypes';
import getGatewayTypeId from 'application/modules/workflow/pages/Workflow/helpers/getGatewayTypeId';

interface GatewayEntity {
  name?: string;
  description?: string;
  gatewayTypeId?: unknown;
  [key: string]: unknown;
}

interface Action {
  type: string;
  payload?: unknown;
  request?: { gatewayId?: string | number };
}

interface GatewaysState {
  actual: Record<string, GatewayEntity | null>;
  origin: Record<string, GatewayEntity | null>;
  types: unknown[] | null;
}

const REQUEST_GATEWAY_SUCCESS = 'GATEWAYS/REQUEST_GATEWAY_SUCCESS';
const REQUEST_GATEWAY_FAIL = 'GATEWAYS/REQUEST_GATEWAY_FAIL';
const CHANGE_GATEWAY_DATA = 'GATEWAYS/CHANGE_GATEWAY_DATA';
const SAVE_GATEWAY_DATA_SUCCESS = 'GATEWAYS/SAVE_GATEWAY_DATA_SUCCESS';
const GET_GATEWAY_TYPES_SUCCESS = 'GATEWAYS/GET_GATEWAY_TYPES_SUCCESS';

const DELETE_GATEWAY_SUCCESS = 'GATEWAYS/DELETE_GATEWAY_SUCCESS';

const ELEMENT_CHANGED = 'WORKFLOW/ELEMENT_CHANGED';
const UNDO_GATEWAY_DATA = 'UNDO_GATEWAY_DATA';

const initialState: GatewaysState = {
  actual: {},
  origin: {},
  types: null
};

const gatewayToStateGateway = ({ name, description, ...gateway }: GatewayEntity): GatewayEntity => ({
  ...gateway,
  name: name || '',
  description: description || ''
});

const rootReducer = (state: GatewaysState = initialState, action: Action): GatewaysState => {
  switch (action.type) {
    case GET_GATEWAY_TYPES_SUCCESS: {
      return {
        ...state,
        types: action.payload as unknown[]
      };
    }
    case REQUEST_GATEWAY_SUCCESS: {
      const { gatewayId } = action.request as { gatewayId: string | number };
      const gateway = gatewayToStateGateway(action.payload as GatewayEntity);

      return {
        ...state,
        actual: {
          ...state.actual,
          [gatewayId]: gateway
        },
        origin: {
          ...state.origin,
          [gatewayId]: JSON.parse(JSON.stringify(gateway))
        }
      };
    }
    case REQUEST_GATEWAY_FAIL: {
      const { gatewayId } = action.request as { gatewayId: string | number };
      return {
        ...state,
        actual: {
          ...state.actual,
          [gatewayId]: null
        },
        origin: {
          ...state.origin,
          [gatewayId]: null
        }
      };
    }
    case SAVE_GATEWAY_DATA_SUCCESS: {
      const gateways = (action.payload as GatewayEntity[]).reduce<Record<string, GatewayEntity>>(
        (acc, gatewayData) => ({
          ...acc,
          [gatewayData.id as string]: gatewayToStateGateway(gatewayData)
        }),
        {}
      );

      return {
        ...state,
        actual: {
          ...state.actual,
          ...gateways
        },
        origin: {
          ...state.origin,
          ...JSON.parse(JSON.stringify(gateways))
        }
      };
    }
    case CHANGE_GATEWAY_DATA: {
      const { gatewayId, data } = action.payload as { gatewayId: string | number; data: GatewayEntity };
      return {
        ...state,
        actual: {
          ...state.actual,
          [gatewayId]: data
        }
      };
    }
    case ELEMENT_CHANGED: {
      const { type, businessObject } = action.payload as { type: string; businessObject: { id: string; name?: string } };
      const { types } = state;

      if (!gatewayElementTypes.includes(type)) {
        return state;
      }

      const { id, name } = businessObject;
      const gatewayId = id.split('-').pop() as string;
      const gateway = state.actual[gatewayId];

      if (!gateway) {
        return state;
      }

      gateway.name = (name || '').slice(0, 255);
      gateway.gatewayTypeId = getGatewayTypeId({ type }, types as never);

      return {
        ...state,
        actual: {
          ...state.actual,
          [gatewayId]: gateway
        }
      };
    }
    case DELETE_GATEWAY_SUCCESS: {
      const { gatewayId } = action.request as { gatewayId: string };

      const filteredIds = Object.keys(state.actual).filter((id) => id !== gatewayId);
      return {
        ...state,
        actual: filteredIds.reduce<Record<string, GatewayEntity | null>>((acc, id) => ({ ...acc, [id]: state.actual[id] }), {}),
        origin: filteredIds.reduce<Record<string, GatewayEntity | null>>((acc, id) => ({ ...acc, [id]: state.origin[id] }), {})
      };
    }
    case UNDO_GATEWAY_DATA: {
      const { gatewayId } = action.payload as { gatewayId: string };

      // Note: this only shallow-copies `state`, so `newState.actual` is the same object
      // reference as `state.actual` — the delete below mutates it in place. Preserved as-is.
      const newState = {
        ...state
      };

      delete newState.actual[gatewayId];

      return {
        ...newState
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
