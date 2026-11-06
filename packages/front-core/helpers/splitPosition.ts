export const getSplitPosition = (splitName: string, defaultValue?: string): string | number => {
  return parseInt(localStorage.getItem(splitName) as string, 10) || defaultValue || '50%';
};

export const setSplitPosition = (splitName: string) => (size: string): void => {
  localStorage.setItem(splitName, size);
};

export default {
  getSplitPosition,
  setSplitPosition
};
