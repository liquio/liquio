export default (value, filter) => {
  if (filter === null) {
    return false;
  }

  if (Array.isArray(filter)) {
    if (!filter.includes(value)) {
      return true;
    }
  } else if (filter !== value) {
    return true;
  }

  return false;
};
