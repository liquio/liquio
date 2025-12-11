export default async (arr, predicate) => {
  const results = [];

  for (const item of arr) {
    const result = await predicate(item);
    results.push(result);
  }

  return arr.filter((_v, index) => results[index]);
};
