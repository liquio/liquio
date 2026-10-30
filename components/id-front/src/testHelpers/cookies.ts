/** Expires a cookie set through `document.cookie` (the tests share one jsdom document per file). */
export const deleteCookieForTests = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};
