import moment from 'moment';

export default (bytes, si) => {
  const thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let u = -1;
  do {
    bytes /= thresh;
    u += 1;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  // moment.locale() holds the active app language (set in translation/index.js),
  // so the decimal separator follows the user's locale (e.g. 5,0 MB in German)
  const formatted = bytes.toLocaleString(moment.locale(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  return formatted + ' ' + units[u];
};
