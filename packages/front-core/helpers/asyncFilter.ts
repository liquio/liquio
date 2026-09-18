export default async <T>(arr: T[], predicate: (item: T) => Promise<unknown>): Promise<T[]> => {
  const results: unknown[] = [];

  for (const item of arr) {
    const result = await predicate(item);
    results.push(result);
  }

  return arr.filter((_v, index) => results[index]);
};
