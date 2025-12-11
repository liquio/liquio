import eventElementTypes from 'application/modules/workflow/variables/eventElementTypes';

const REQUEST_EVENT_SUCCESS = 'EVENTS/REQUEST_EVENT_SUCCESS';
const REQUEST_EVENT_FAIL = 'EVENTS/REQUEST_EVENT_FAIL';
const CHANGE_EVENT_DATA = 'EVENTS/CHANGE_EVENT_DATA';
const UNDO_EVENT_DATA = 'UNDO_EVENT_DATA';
const SAVE_EVENT_DATA_SUCCESS = 'EVENTS/SAVE_EVENT_DATA_SUCCESS';
const GET_EVENT_TYPES_SUCCESS = 'EVENTS/GET_EVENT_TYPES_SUCCESS';

const DELETE_EVENT_SUCCESS = 'EVENTS/DELETE_EVENT_SUCCESS';

const ELEMENT_CHANGED = 'WORKFLOW/ELEMENT_CHANGED';

const initialState = {
  actual: {},
  origin: {},
  types: null,
};

const eventToStateEvent = ({ jsonSchema, ...event }) => ({
  ...event,
  jsonSchema: JSON.stringify(jsonSchema, null, 4),
});

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_EVENT_TYPES_SUCCESS: {
      return {
        ...state,
        types: action.payload,
      };
    }
    case REQUEST_EVENT_SUCCESS: {
      const { eventId } = action.request;
      const event = eventToStateEvent(action.payload);

      return {
        ...state,
        actual: {
          ...state.actual,
          [eventId]: event,
        },
        origin: {
          ...state.origin,
          [eventId]: JSON.parse(JSON.stringify(event)),
        },
      };
    }
    case REQUEST_EVENT_FAIL: {
      const { eventId } = action.request;
      return {
        ...state,
        actual: {
          ...state.actual,
          [eventId]: null,
        },
        origin: {
          ...state.origin,
          [eventId]: null,
        },
      };
    }
    case SAVE_EVENT_DATA_SUCCESS: {
      const events = action.payload.reduce(
        (acc, eventData) => ({
          ...acc,
          [eventData.id]: eventToStateEvent(eventData),
        }),
        {},
      );

      return {
        ...state,
        actual: {
          ...state.actual,
          ...events,
        },
        origin: {
          ...state.origin,
          ...JSON.parse(JSON.stringify(events)),
        },
      };
    }
    case CHANGE_EVENT_DATA: {
      const { eventId, data } = action.payload;
      return {
        ...state,
        actual: {
          ...state.actual,
          [eventId]: data,
        },
      };
    }
    case ELEMENT_CHANGED: {
      const { type, businessObject } = action.payload;

      if (!eventElementTypes.includes(type)) {
        return state;
      }

      const { id, name } = businessObject;
      const eventId = id.split('-').pop();
      const event = state.actual[eventId];

      if (!event) {
        return state;
      }

      return {
        ...state,
        actual: {
          ...state.actual,
          [eventId]: { ...event, name: (name || '').slice(0, 255) },
        },
      };
    }
    case DELETE_EVENT_SUCCESS: {
      const { eventId } = action.request;

      const filteredIds = Object.keys(state.actual).filter(
        (id) => id !== eventId,
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
    case UNDO_EVENT_DATA: {
      const { eventId } = action.payload;

      const newState = {
        ...state,
      };

      delete newState.actual[eventId];

      return {
        ...newState,
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
