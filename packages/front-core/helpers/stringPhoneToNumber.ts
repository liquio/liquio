export default (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  return value.replace(/[+()-\s]/gi, '');
};
