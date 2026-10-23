import eventElementTypes from 'application/modules/workflow/variables/eventElementTypes';

interface EventEntity {
  jsonSchema?: unknown;
  name?: string;
  [key: string]: unknown;
}

interface Action {
  type: string;
  payload?: unknown;
  request?: { eventId?: string | number };
}

interface EventsState {
  actual: Record<string, EventEntity | null>;
  origin: Record<string, EventEntity | null>;
  types: unknown[] | null;
}

const REQUEST_EVENT_SUCCESS = 'EVENTS/REQUEST_EVENT_SUCCESS';
const REQUEST_EVENT_FAIL = 'EVENTS/REQUEST_EVENT_FAIL';
const CHANGE_EVENT_DATA = 'EVENTS/CHANGE_EVENT_DATA';
const UNDO_EVENT_DATA = 'UNDO_EVENT_DATA';
const SAVE_EVENT_DATA_SUCCESS = 'EVENTS/SAVE_EVENT_DATA_SUCCESS';
const GET_EVENT_TYPES_SUCCESS = 'EVENTS/GET_EVENT_TYPES_SUCCESS';

const DELETE_EVENT_SUCCESS = 'EVENTS/DELETE_EVENT_SUCCESS';

const ELEMENT_CHANGED = 'WORKFLOW/ELEMENT_CHANGED';

const initialState: EventsState = {
  actual: {},
  origin: {},
  types: null
};

const eventToStateEvent = ({ jsonSchema, ...event }: EventEntity): EventEntity => ({
  ...event,
  jsonSchema: JSON.stringify(jsonSchema, null, 4)
});

const rootReducer = (state: EventsState = initialState, action: Action): EventsState => {
  switch (action.type) {
    case GET_EVENT_TYPES_SUCCESS: {
      return {
        ...state,
        types: action.payload as unknown[]
      };
    }
    case REQUEST_EVENT_SUCCESS: {
      const { eventId } = action.request as { eventId: string | number };
      const event = eventToStateEvent(action.payload as EventEntity);

      return {
        ...state,
        actual: {
          ...state.actual,
          [eventId]: event
        },
        origin: {
          ...state.origin,
          [eventId]: JSON.parse(JSON.stringify(event))
        }
      };
    }
    case REQUEST_EVENT_FAIL: {
      const { eventId } = action.request as { eventId: string | number };
      return {
        ...state,
        actual: {
          ...state.actual,
          [eventId]: null
        },
        origin: {
          ...state.origin,
          [eventId]: null
        }
      };
    }
    case SAVE_EVENT_DATA_SUCCESS: {
      const events = (action.payload as EventEntity[]).reduce<Record<string, EventEntity>>(
        (acc, eventData) => ({
          ...acc,
          [eventData.id as string]: eventToStateEvent(eventData)
        }),
        {}
      );

      return {
        ...state,
        actual: {
          ...state.actual,
          ...events
        },
        origin: {
          ...state.origin,
          ...JSON.parse(JSON.stringify(events))
        }
      };
    }
    case CHANGE_EVENT_DATA: {
      const { eventId, data } = action.payload as { eventId: string | number; data: EventEntity };
      return {
        ...state,
        actual: {
          ...state.actual,
          [eventId]: data
        }
      };
    }
    case ELEMENT_CHANGED: {
      const { type, businessObject } = action.payload as { type: string; businessObject: { id: string; name?: string } };

      if (!eventElementTypes.includes(type)) {
        return state;
      }

      const { id, name } = businessObject;
      const eventId = id.split('-').pop() as string;
      const event = state.actual[eventId];

      if (!event) {
        return state;
      }

      return {
        ...state,
        actual: {
          ...state.actual,
          [eventId]: { ...event, name: (name || '').slice(0, 255) }
        }
      };
    }
    case DELETE_EVENT_SUCCESS: {
      const { eventId } = action.request as { eventId: string };

      const filteredIds = Object.keys(state.actual).filter((id) => id !== eventId);
      return {
        ...state,
        actual: filteredIds.reduce<Record<string, EventEntity | null>>((acc, id) => ({ ...acc, [id]: state.actual[id] }), {}),
        origin: filteredIds.reduce<Record<string, EventEntity | null>>((acc, id) => ({ ...acc, [id]: state.origin[id] }), {})
      };
    }
    case UNDO_EVENT_DATA: {
      const { eventId } = action.payload as { eventId: string };

      // Note: this only shallow-copies `state`, so `newState.actual` is the same object
      // reference as `state.actual` — the delete below mutates it in place. Preserved as-is.
      const newState = {
        ...state
      };

      delete newState.actual[eventId];

      return {
        ...newState
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
