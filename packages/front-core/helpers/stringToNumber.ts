export default (value: unknown): number => {
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.').replace(/[^\d.-]/gi, ''));
    return Number.isNaN(parsed) ? 0 : parsed || 0;
  }

  return (value as number) || 0;
};
