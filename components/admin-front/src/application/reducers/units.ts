import objectPath from 'object-path';

interface Action {
  type: string;
  payload?: unknown;
  url?: string;
}

interface UnitsState {
  actual: Record<string, unknown>;
  origin: Record<string, unknown>;
  list: Array<{ id: unknown; name: unknown }> | null;
}

const REQUEST_UNIT_SUCCESS = 'UNITS/REQUEST_UNIT_SUCCESS';
const UPDATE_UNIT_DATA = 'UNITS/UPDATE_UNIT_DATA';
const SAVE_UNIT_SUCCESS = 'UNITS/SAVE_UNIT_SUCCESS';
const CLEAR_NEW_UNIT = 'UNITS/CLEAR_NEW_UNIT';
const REQUEST_ALL_UNITS_SUCCESS = 'UNITS/REQUEST_ALL_UNITS_SUCCESS';
const CREATE_UNIT_SUCCESS = 'UNITS/CREATE_UNIT_SUCCESS';
const DELETE_UNIT_SUCCESS = 'DATA_TABLE/UNITLIST/ON_ROWS_DELETE_SUCCESS';

const newUnitConfig = {
  data: {},
  allowTokens: [] as unknown[],
  heads: [] as unknown[],
  members: [] as unknown[],
  menuConfig: {
    defaultRoute: '',
    modules: {
      inbox: { InboxFilesListPage: false, InboxFilesPage: false },
      messages: { MessageListPage: false, MessagePage: false },
      registry: { RegistryPage: false },
      tasks: {
        InboxTasks: false,
        UnitInboxTasks: false,
        ClosedTasks: false,
        UnitClosedTasks: false
      },
      workflow: {
        MyWorkflow: false,
        Drafts: false,
        Trash: false,
        WorkflowPage: false
      }
    },
    navigation: {
      inbox: { InboxFilesListPage: false },
      messages: { MessageListPage: false },
      registry: { RegistryPage: false },
      tasks: {
        CreateTaskButton: false,
        InboxTasks: false,
        UnitInboxTasks: false,
        ClosedTasks: false,
        UnitClosedTasks: false
      },
      workflow: { MyWorkflow: false, Drafts: false, Trash: false }
    }
  }
};

const initialState: UnitsState = {
  actual: {
    new: newUnitConfig
  },
  origin: {},
  list: null
};

const rootReducer = (state: UnitsState = initialState, action: Action): UnitsState => {
  switch (action.type) {
    case SAVE_UNIT_SUCCESS:
    case REQUEST_UNIT_SUCCESS: {
      const { id } = action.payload as { id: string | number };

      const copyData = { ...(action.payload as Record<string, unknown>) };

      const param = objectPath.get(copyData, 'menuConfig.navigation.tasks.CreateTaskButton');

      objectPath.set(copyData, 'menuConfig.navigation.CreateTaskButton', param);

      return {
        ...state,
        actual: {
          ...state.actual,
          [id]: copyData
        },
        origin: {
          ...state.origin,
          [id]: JSON.parse(JSON.stringify(copyData))
        }
      };
    }
    case UPDATE_UNIT_DATA: {
      const { id } = action.payload as { id?: string | number };
      return {
        ...state,
        actual: {
          ...state.actual,
          [id || 'new']: action.payload
        }
      };
    }
    case CLEAR_NEW_UNIT: {
      return {
        ...state,
        actual: {
          ...state.actual,
          new: {
            data: {},
            allowTokens: [],
            heads: [],
            members: [],
            menuConfig: {}
          }
        }
      };
    }
    case REQUEST_ALL_UNITS_SUCCESS: {
      return {
        ...state,
        list: action.payload as UnitsState['list']
      };
    }
    case CREATE_UNIT_SUCCESS: {
      const { id, name } = action.payload as { id: unknown; name: unknown };
      return {
        ...state,
        list: state.list && state.list.concat([{ id, name }])
      };
    }
    case DELETE_UNIT_SUCCESS: {
      const { url } = action;
      const unitId = parseInt((url as string).split('/').pop() as string, 10);
      return {
        ...state,
        list: state.list && state.list.filter(({ id }) => id !== unitId)
      };
    }
    default:
      return state;
  }
};

export { newUnitConfig };
export default rootReducer;
