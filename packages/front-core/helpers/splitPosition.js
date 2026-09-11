export const getSplitPosition = (splitName, defaultValue) => {
  return parseInt(localStorage.getItem(splitName), 10) || defaultValue || '50%';
};

export const setSplitPosition = (splitName) => (size) => {
  localStorage.setItem(splitName, size);
};

export default {
  getSplitPosition,
  setSplitPosition,
};
