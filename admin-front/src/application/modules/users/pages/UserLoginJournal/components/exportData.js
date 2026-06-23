import moment from 'moment';

import { formatUserName } from 'helpers/userName';

const DATETIME_FORMAT = 'DD.MM.YYYY HH:mm:ss';

const formatDate = (value) => (value ? moment(value).format(DATETIME_FORMAT) : '');

const formatIp = (ips) =>
  Array.isArray(ips) ? ips.filter((ip) => ip.indexOf('127.0.0.1') < 0).join(', ') : '';

export const getVisibleColumns = (columns = [], hiddenColumns = []) =>
  columns.filter(({ id }) => !hiddenColumns.includes(id));

export const getCellValue = (columnId, row) => {
  switch (columnId) {
    case 'createdAt':
      return formatDate(row.createdAt);
    case 'expiresAt':
      return formatDate(row.expiresAt);
    case 'ip':
      return formatIp(row.ip);
    case 'userName':
      return formatUserName(row.userName);
    default: {
      const value = row[columnId];
      return value === null || value === undefined ? '' : String(value);
    }
  }
};

export const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const loadAllRows = async (actions) => {
  const requests = actions.loadAllDataRequests();
  const rows = [];

  for (const request of requests) {
    const result = await request();
    if (Array.isArray(result)) {
      rows.push(...result);
    }
  }

  return rows;
};
