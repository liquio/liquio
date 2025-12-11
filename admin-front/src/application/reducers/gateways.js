import gatewayElementTypes from 'application/modules/workflow/variables/gatewayElementTypes';
import getGatewayTypeId from 'application/modules/workflow/pages/Workflow/helpers/getGatewayTypeId';

const REQUEST_GATEWAY_SUCCESS = 'GATEWAYS/REQUEST_GATEWAY_SUCCESS';
const REQUEST_GATEWAY_FAIL = 'GATEWAYS/REQUEST_GATEWAY_FAIL';
const CHANGE_GATEWAY_DATA = 'GATEWAYS/CHANGE_GATEWAY_DATA';
const SAVE_GATEWAY_DATA_SUCCESS = 'GATEWAYS/SAVE_GATEWAY_DATA_SUCCESS';
const GET_GATEWAY_TYPES_SUCCESS = 'GATEWAYS/GET_GATEWAY_TYPES_SUCCESS';

const DELETE_GATEWAY_SUCCESS = 'GATEWAYS/DELETE_GATEWAY_SUCCESS';

const ELEMENT_CHANGED = 'WORKFLOW/ELEMENT_CHANGED';
const UNDO_GATEWAY_DATA = 'UNDO_GATEWAY_DATA';

const initialState = {
  actual: {},
  origin: {},
  types: null,
};

const gatewayToStateGateway = ({ name, description, ...gateway }) => ({
  ...gateway,
  name: name || '',
  description: description || '',
});

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_GATEWAY_TYPES_SUCCESS: {
      return {
        ...state,
        types: action.payload,
      };
    }
    case REQUEST_GATEWAY_SUCCESS: {
      const { gatewayId } = action.request;
      const gateway = gatewayToStateGateway(action.payload);

      return {
        ...state,
        actual: {
          ...state.actual,
          [gatewayId]: gateway,
        },
        origin: {
          ...state.origin,
          [gatewayId]: JSON.parse(JSON.stringify(gateway)),
        },
      };
    }
    case REQUEST_GATEWAY_FAIL: {
      const { gatewayId } = action.request;
      return {
        ...state,
        actual: {
          ...state.actual,
          [gatewayId]: null,
        },
        origin: {
          ...state.origin,
          [gatewayId]: null,
        },
      };
    }
    case SAVE_GATEWAY_DATA_SUCCESS: {
      const gateways = action.payload.reduce(
        (acc, gatewayData) => ({
          ...acc,
          [gatewayData.id]: gatewayToStateGateway(gatewayData),
        }),
        {},
      );

      return {
        ...state,
        actual: {
          ...state.actual,
          ...gateways,
        },
        origin: {
          ...state.origin,
          ...JSON.parse(JSON.stringify(gateways)),
        },
      };
    }
    case CHANGE_GATEWAY_DATA: {
      const { gatewayId, data } = action.payload;
      return {
        ...state,
        actual: {
          ...state.actual,
          [gatewayId]: data,
        },
      };
    }
    case ELEMENT_CHANGED: {
      const { type, businessObject } = action.payload;
      const { types } = state;

      if (!gatewayElementTypes.includes(type)) {
        return state;
      }

      const { id, name } = businessObject;
      const gatewayId = id.split('-').pop();
      const gateway = state.actual[gatewayId];

      if (!gateway) {
        return state;
      }

      gateway.name = (name || '').slice(0, 255);
      gateway.gatewayTypeId = getGatewayTypeId(action.payload, types);

      return {
        ...state,
        actual: {
          ...state.actual,
          [gatewayId]: gateway,
        },
      };
    }
    case DELETE_GATEWAY_SUCCESS: {
      const { gatewayId } = action.request;

      const filteredIds = Object.keys(state.actual).filter(
        (id) => id !== gatewayId,
      );
      return {
        ...state,
        actual: filteredIds.reduce(
          (acc, id) => ({ ...acc, [id]: state.actual[id] }),
          {},
        ),
        origin: filteredIds.reduce(
          (acc, id) => ({ ...acc, [id]: state.origin[id] }),
          {},
        ),
      };
    }
    case UNDO_GATEWAY_DATA: {
      const { gatewayId } = action.payload;

      const newState = {
        ...state,
      };

      delete newState.actual[gatewayId];

      return {
        ...newState,
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
