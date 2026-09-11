import qs from 'qs';
import {
  blockUser,
  unblockUser,
  setAdmin,
  unsetAdmin,
} from 'application/actions/users';

const BLOCK_USER_SUCCESS = 'USERS/BLOCK_USER_SUCCESS';
const UNBLOCK_USER_SUCCESS = 'USERS/UNBLOCK_USER_SUCCESS';

const SET_USER_ADMIN_SUCCESS = 'USERS/SET_USER_ADMIN_SUCCESS';
const UNSET_USER_ADMIN_SUCCESS = 'USERS/UNSET_USER_ADMIN_SUCCESS';

const endPoint = {
  dataURL: 'users',
  sourceName: 'userList',
  actions: { blockUser, unblockUser, setAdmin, unsetAdmin },
  // searchFilterField: 'search'
};

endPoint.mapData = (payload, { page }) => {
  const { meta } = payload;
  const { total } = meta || {};

  return {
    data: payload.map(({ userId, ...user }) => ({
      ...user,
      id: userId,
    })),
    page: page || 1,
    count: total,
  };
};

endPoint.getDataUrl = (
  url,
  { page, rowsPerPage, filters: { name: search, ipn, id, phone, email, role } },
) => {
  const urlData = {};

  if (rowsPerPage) {
    urlData.limit = rowsPerPage;
  }

  if (ipn) {
    urlData.ipn = ipn;
  }

  if (id) {
    urlData.id = id;
  }

  if (phone) {
    urlData.phone = phone;
  }

  if (email) {
    urlData.email = email;
  }

  if (search) {
    urlData.search = search;
  }

  if (role) {
    urlData.role = role;
  }

  urlData.offset = ((page || 1) - 1) * (rowsPerPage || 10);

  const queryString = qs.stringify(urlData, { arrayFormat: 'index' });
  return url + (queryString && '?' + queryString);
};

endPoint.reduce = (state, action) => {
  switch (action.type) {
    case BLOCK_USER_SUCCESS: {
      const { userId } = action.request;
      return {
        ...state,
        data: state.data.map((user) => {
          if (user.id !== userId) {
            return user;
          }

          return {
            ...user,
            isActive: false,
          };
        }),
      };
    }
    case UNBLOCK_USER_SUCCESS: {
      const { userId } = action.request;
      return {
        ...state,
        data: state.data.map((user) => {
          if (user.id !== userId) {
            return user;
          }

          return {
            ...user,
            isActive: true,
          };
        }),
      };
    }
    case SET_USER_ADMIN_SUCCESS: {
      const { userId } = action.request;
      return {
        ...state,
        data: state.data.map((user) => {
          if (user.id !== userId) {
            return user;
          }

          return {
            ...user,
            role: 'individual;admin',
          };
        }),
      };
    }
    case UNSET_USER_ADMIN_SUCCESS: {
      const { userId } = action.request;
      return {
        ...state,
        data: state.data.map((user) => {
          if (user.id !== userId) {
            return user;
          }

          return {
            ...user,
            role: 'individual',
          };
        }),
      };
    }
    default:
      return state;
  }
};

export default endPoint;
