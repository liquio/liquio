interface MessagesState {
  unreadCount: number;
  viewedList: unknown[];
  list: unknown[] | null;
}

interface MessagesAction {
  type: string;
  payload?: unknown;
}

const initialState: MessagesState = {
  unreadCount: 0,
  viewedList: [],
  list: null
};

const GET_MESSAGES_SUCCESS = 'GET_MESSAGES_SUCCESS';
const GET_UNREAD_MESSAGE_COUNT_SUCCESS = 'GET_UNREAD_MESSAGE_COUNT_SUCCESS';
const GET_LIST_SUCCESS = 'DATA_TABLE/MESSAGESLIST/GET_LIST_SUCCESS';
const GET_VIEWED_MESSAGE_LIST = 'GET_VIEWED_MESSAGE_LIST';

const rootReducer = (state: MessagesState = initialState, action: MessagesAction): MessagesState => {
  switch (action.type) {
    case GET_MESSAGES_SUCCESS:
      return { ...state, list: action.payload as unknown[] };
    case GET_LIST_SUCCESS: {
      const payload = action.payload as { meta?: { unread: number } };
      if (!payload.meta) return state;
      const {
        meta: { unread }
      } = payload;
      return { ...state, unreadCount: unread };
    }
    case GET_UNREAD_MESSAGE_COUNT_SUCCESS: {
      const payload = action.payload as { total: number } | undefined;
      if (!payload) return state;
      const { total } = payload;
      return { ...state, unreadCount: total };
    }
    case GET_VIEWED_MESSAGE_LIST: {
      return { ...state, viewedList: action.payload as unknown[] };
    }
    default:
      return state;
  }
};
export default rootReducer;
