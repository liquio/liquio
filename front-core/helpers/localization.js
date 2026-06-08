export const normalizeCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  return code.trim().toLowerCase();
};
