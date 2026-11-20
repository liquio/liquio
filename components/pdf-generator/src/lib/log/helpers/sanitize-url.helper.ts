const MAX_URL_LENGTH = 200;
const URL_WITH_QUERY = /(\b[a-z][a-z0-9+.-]*:\/\/)(?:[^\s/?#"'<>@]*@)?([^\s?#"'<>]*)[?#][^\s"'<>]*/gi;

/**
 * Makes a URL safe to log: drops userinfo, query string and fragment (they may carry secrets), keeps only the
 * type of `data:` URLs and limits the length.
 */
export const sanitizeUrl = (url: unknown, maxLength = MAX_URL_LENGTH): string => {
  const value = typeof url === 'string' ? url : '';
  if (/^data:/i.test(value)) {
    return value.slice(0, value.indexOf(',') >= 0 ? value.indexOf(',') : 5).slice(0, maxLength);
  }

  const stripped = value.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^\s/?#@]*@/i, '$1').split(/[?#]/)[0];
  return stripped.slice(0, maxLength);
};

/**
 * Removes userinfo and query strings from every URL found in free text (e.g. an error message).
 */
export const sanitizeUrlsInText = (text: unknown, maxLength = 500): string => {
  const value = typeof text === 'string' ? text : String(text ?? '');
  return value.replace(URL_WITH_QUERY, '$1$2').slice(0, maxLength);
};
