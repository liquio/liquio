import qs from 'qs';
import { blockUser, unblockUser, setAdmin, unsetAdmin } from 'application/actions/users';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

const BLOCK_USER_SUCCESS = 'USERS/BLOCK_USER_SUCCESS';
const UNBLOCK_USER_SUCCESS = 'USERS/UNBLOCK_USER_SUCCESS';

const SET_USER_ADMIN_SUCCESS = 'USERS/SET_USER_ADMIN_SUCCESS';
const UNSET_USER_ADMIN_SUCCESS = 'USERS/UNSET_USER_ADMIN_SUCCESS';

interface UserRow {
  id: unknown;
  isActive?: boolean;
  role?: string;
  [key: string]: unknown;
}

const endPoint: DataTableEndpoint = {
  dataURL: 'users',
  sourceName: 'userList',
  actions: { blockUser, unblockUser, setAdmin, unsetAdmin }
  // searchFilterField: 'search'
};

endPoint.mapData = (payload, { page }) => {
  const { meta } = payload as { meta?: { total?: number } };
  const { total } = meta || {};

  return {
    data: (payload as Array<Record<string, unknown>>).map(({ userId, ...user }) => ({
      ...user,
      id: userId
    })),
    page: page || 1,
    count: total
  };
};

endPoint.getDataUrl = (url, { page, rowsPerPage, filters }) => {
  const { name: search, ipn, id, phone, email, role } = filters;
  const urlData: Record<string, unknown> = {};

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

  urlData.offset = ((page || 1) - 1) * ((rowsPerPage as number) || 10);

  const queryString = qs.stringify(urlData, { arrayFormat: 'index' });
  return url + (queryString && '?' + queryString);
};

endPoint.reduce = (state, action) => {
  switch (action.type) {
    case BLOCK_USER_SUCCESS: {
      const { userId } = action.request as { userId: unknown };
      return {
        ...state,
        data: (state.data as UserRow[]).map((user) => (user.id !== userId ? user : { ...user, isActive: false }))
      };
    }
    case UNBLOCK_USER_SUCCESS: {
      const { userId } = action.request as { userId: unknown };
      return {
        ...state,
        data: (state.data as UserRow[]).map((user) => (user.id !== userId ? user : { ...user, isActive: true }))
      };
    }
    case SET_USER_ADMIN_SUCCESS: {
      const { userId } = action.request as { userId: unknown };
      return {
        ...state,
        data: (state.data as UserRow[]).map((user) => (user.id !== userId ? user : { ...user, role: 'individual;admin' }))
      };
    }
    case UNSET_USER_ADMIN_SUCCESS: {
      const { userId } = action.request as { userId: unknown };
      return {
        ...state,
        data: (state.data as UserRow[]).map((user) => (user.id !== userId ? user : { ...user, role: 'individual' }))
      };
    }
    default:
      return state;
  }
};

export default endPoint;
