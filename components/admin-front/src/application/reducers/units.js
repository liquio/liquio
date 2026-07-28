import objectPath from 'object-path';

const REQUEST_UNIT_SUCCESS = 'UNITS/REQUEST_UNIT_SUCCESS';
const UPDATE_UNIT_DATA = 'UNITS/UPDATE_UNIT_DATA';
const SAVE_UNIT_SUCCESS = 'UNITS/SAVE_UNIT_SUCCESS';
const CLEAR_NEW_UNIT = 'UNITS/CLEAR_NEW_UNIT';
const REQUEST_ALL_UNITS_SUCCESS = 'UNITS/REQUEST_ALL_UNITS_SUCCESS';
const CREATE_UNIT_SUCCESS = 'UNITS/CREATE_UNIT_SUCCESS';
const DELETE_UNIT_SUCCESS = 'DATA_TABLE/UNITLIST/ON_ROWS_DELETE_SUCCESS';

const newUnitConfig = {
  data: {},
  allowTokens: [],
  heads: [],
  members: [],
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
        UnitClosedTasks: false,
      },
      workflow: {
        MyWorkflow: false,
        Drafts: false,
        Trash: false,
        WorkflowPage: false,
      },
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
        UnitClosedTasks: false,
      },
      workflow: { MyWorkflow: false, Drafts: false, Trash: false },
    },
  },
};

const initialState = {
  actual: {
    new: newUnitConfig,
  },
  origin: {},
  list: null,
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SAVE_UNIT_SUCCESS:
    case REQUEST_UNIT_SUCCESS: {
      const { id } = action.payload;

      const copyData = { ...action.payload };

      const param = objectPath.get(
        copyData,
        'menuConfig.navigation.tasks.CreateTaskButton',
      );

      objectPath.set(copyData, 'menuConfig.navigation.CreateTaskButton', param);

      return {
        ...state,
        actual: {
          ...state.actual,
          [id]: copyData,
        },
        origin: {
          ...state.origin,
          [id]: JSON.parse(JSON.stringify(copyData)),
        },
      };
    }
    case UPDATE_UNIT_DATA: {
      const { id } = action.payload;
      return {
        ...state,
        actual: {
          ...state.actual,
          [id || 'new']: action.payload,
        },
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
            menuConfig: {},
          },
        },
      };
    }
    case REQUEST_ALL_UNITS_SUCCESS: {
      return {
        ...state,
        list: action.payload,
      };
    }
    case CREATE_UNIT_SUCCESS: {
      const { id, name } = action.payload;
      return {
        ...state,
        list: state.list && state.list.concat([{ id, name }]),
      };
    }
    case DELETE_UNIT_SUCCESS: {
      const { url } = action;
      const unitId = parseInt(url.split('/').pop(), 10);
      return {
        ...state,
        list: state.list && state.list.filter(({ id }) => id !== unitId),
      };
    }
    default:
      return state;
  }
};

export { newUnitConfig };
export default rootReducer;
