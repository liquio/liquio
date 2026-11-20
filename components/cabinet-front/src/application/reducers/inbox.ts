interface InboxState {
  unreadCount: number;
}

interface InboxAction {
  type: string;
  payload?: number;
}

const GET_UNREAD_INBOX_COUNT_SUCCESS = 'GET_UNREAD_INBOX_COUNT_SUCCESS';

const initialState: InboxState = {
  unreadCount: 0
};

export default (state: InboxState = initialState, action: InboxAction): InboxState => {
  switch (action.type) {
    case GET_UNREAD_INBOX_COUNT_SUCCESS:
      return { ...state, unreadCount: action.payload as number };
    default:
      return state;
  }
};
