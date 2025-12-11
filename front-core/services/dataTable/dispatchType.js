export default (sourceName, type) =>
  ['DATA_TABLE', sourceName.toUpperCase(), type].filter(Boolean).join('/');
