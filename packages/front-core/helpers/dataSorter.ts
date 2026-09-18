type SortOrder = 'asc' | 'desc';

const multiplier = (order: SortOrder): number => (order === 'asc' ? 1 : -1);

export default (sorts: Record<string, SortOrder>) => (a: Record<string, unknown>, b: Record<string, unknown>): number => {
  const sortingKeys = Object.keys(sorts);

  for (let s = 0; s < sortingKeys.length; s++) {
    const key = sortingKeys[s];
    if ((a[key] as never) > (b[key] as never)) {
      return -1 * multiplier(sorts[key]);
    }

    if ((a[key] as never) < (b[key] as never)) {
      return 1 * multiplier(sorts[key]);
    }
  }

  return 0;
};
