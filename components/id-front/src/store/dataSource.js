import * as api from 'services/api';
import store from 'store';
import qs from 'qs';
import moment from 'moment';

const stores = {};

class DataSource {
  data = [];
  busy = false;
  totalCount = 0;

  start = 0;
  count = 20;
  page = 0;
  search = '';
  filters = {};
  privateFilters = {};
  sort = {};
  isNotDeleted = true;
  params = {};
  storeName = null;
  subName = null;

  constructor(baseUrl, subName) {
    this.baseUrl = baseUrl;
    this.subName = subName;
  }

  reset = () => {
    this.page = 0;
    this.start = 0;
    this.count = 20;
    this.search = '';
    this.filters = {};
  };

  updateFilters = () => {
    const updatedFilters = { ...this.filters, ...this.privateFilters };
    if (updatedFilters.createdAt) {
      const parts = updatedFilters.createdAt.split(',');
      if (parts.length === 1) {
        this.filters.createdAt = {};
        delete updatedFilters.createdAt;
      }
      if (parts.length === 2) {
        updatedFilters.createdAt = `${parts[0]},${moment(parts[1]).add(1, 'days').format('YYYY-MM-DD')}`;
      }
    }
    return updatedFilters;
  };

  load = (id) =>
    api.get(this.getUrl(id), this.getActionName(), store.dispatch).then((req) => {
      if (req.data instanceof Error) {
        return Promise.reject(req.data);
      }

      this.busy = false;
      this.totalCount = req.total;
      this.data = req.data;

      return Promise.resolve({ data: req.data, total: req.total });
    });

  setFilter(name, value) {
    this.filters[name] = value || undefined;
  }

  setSearch(value) {
    this.search = value || undefined;
  }

  setValue(valueName, value) {
    this[valueName] = value;
  }

  clear = () => {
    this.start = 0;
    this.search = '';
    this.filters = {};
    this.sort = {};
  };

  getActionName = () => `DATA_SOURCE/REQUEST_${this.baseUrl.toUpperCase().replace('/', '_')}${this.subName ? `_${this.subName.toUpperCase()}` : ''}`;

  getUrl = (id) => {
    const url = `${this.baseUrl}${id ? `/${id}` : ''}`;
    return `${url}?${qs.stringify(
      Object.assign(
        Object.keys(this.params).reduce((acc, key) => {
          acc[key] = this.params[key];
          return acc;
        }, {}),
        this.isNotDeleted ? { is_not_deleted: 1 } : { is_deleted: 1 },
        this.search && { search: this.search },
        {
          start: this.start,
          count: this.count,
          filter: this.updateFilters(),
          sort: this.sort,
        },
      ),
      { arrayFormat: 'index' },
    )}`;
  };

  reducer = (initialState) => (state, data) => {
    const storeName = this.storeName || 'list';
    if (data.type === this.getActionName() + '_FAIL') {
      return { ...state, [storeName]: [] };
    }

    if (data.type !== this.getActionName() + '_SUCCESS') {
      return state || initialState;
    }

    return { ...state, [storeName]: data.payload };
  };
}

export default function (name, subName) {
  const storesName = `${name}${subName || ''}`;
  if (!stores[storesName]) {
    stores[storesName] = new DataSource(name, subName);
  }

  return stores[storesName];
}
