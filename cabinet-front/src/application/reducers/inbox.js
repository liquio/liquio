const GET_UNREAD_INBOX_COUNT_SUCCESS = 'GET_UNREAD_INBOX_COUNT_SUCCESS';

const initialState = {
  unreadCount: 0
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_UNREAD_INBOX_COUNT_SUCCESS:
      return { ...state, unreadCount: action.payload };
    default:
      return state;
  }
};
