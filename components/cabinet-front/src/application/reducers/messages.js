const initialState = {
  unreadCount: 0,
  viewedList: [],
  list: null
};

const GET_MESSAGES_SUCCESS = 'GET_MESSAGES_SUCCESS';
const GET_UNREAD_MESSAGE_COUNT_SUCCESS = 'GET_UNREAD_MESSAGE_COUNT_SUCCESS';
const GET_LIST_SUCCESS = 'DATA_TABLE/MESSAGESLIST/GET_LIST_SUCCESS';
const GET_VIEWED_MESSAGE_LIST = 'GET_VIEWED_MESSAGE_LIST';

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_MESSAGES_SUCCESS:
      return { ...state, list: action.payload };
    case GET_LIST_SUCCESS: {
      if (!action.payload.meta) return state;
      const {
        meta: { unread }
      } = action.payload;
      return { ...state, unreadCount: unread };
    }
    case GET_UNREAD_MESSAGE_COUNT_SUCCESS: {
      if (!action.payload) return state;
      const { total } = action.payload;
      return { ...state, unreadCount: total };
    }
    case GET_VIEWED_MESSAGE_LIST: {
      return { ...state, viewedList: action.payload };
    }
    default:
      return state;
  }
};
export default rootReducer;
