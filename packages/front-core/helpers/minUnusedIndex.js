export default (ids, from = 0) => {
  const maxIndex = Math.max(...[0].concat(ids));

  for (let i = from; i <= maxIndex; i += 1) {
    if (!ids.includes(i)) {
      return i;
    }
  }
  return maxIndex + 1;
};
