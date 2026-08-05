import qs from 'qs';
import moment from 'moment';

const specialKeys = ['update_to', 'updatedAt'];

const arrayToObject = (array, key, val) => {
  const initialValue = {};
  return array.reduce((obj, item) => {
    const value = item[val];
    const name = `data_like[${item[key].replace('data.', '')}]`;

    if (specialKeys.includes(item[key])) {
      const updatedFrom = moment(value, ['DD.MM.YYYY', 'YYYY-MM-DD'], true).format('YYYY-MM-DD');
      const updatedTo = moment(updatedFrom).add(1, 'days').format('YYYY-MM-DD');
      return {
        ...obj,
        updated_from: updatedFrom,
        updated_to: updatedTo
      };
    }

    return {
      ...obj,
      [name]: value
    };
  }, initialValue);
};

export default {
  dataURL: 'registers/keys',
  sourceName: 'registryRecordList',
  getDataUrl: (
    dataURL,
    { page, rowsPerPage, filters: { keyId, name: search, searchKeys }, sort },
    useQueryParams = true
  ) => {
    const offset = ((page || 1) - 1) * rowsPerPage;

    const keys = searchKeys ? arrayToObject(searchKeys, 'columnName', 'value') : {};

    const queryString = qs.stringify(
      { offset, limit: rowsPerPage, search, sort, ...keys },
      { arrayFormat: 'index' }
    );

    return `${dataURL}/${keyId}/records` + (useQueryParams && queryString ? '?' + queryString : '');
  },
  mapData: (payload) => {
    const { meta } = payload;
    const { limit, count, offset } = meta || {};

    return {
      data: payload,
      page: Math.ceil(offset / limit) + 1,
      rowsPerPage: limit,
      count
    };
  }
};
