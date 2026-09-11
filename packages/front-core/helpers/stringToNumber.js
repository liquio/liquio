export default (value) => {
  if (typeof value === 'string') {
    value = Number(value.replace(',', '.').replace(/[^\d.-]/gi, ''));
    if (Number.isNaN(value)) {
      return 0;
    }
  }

  return value || 0;
};
