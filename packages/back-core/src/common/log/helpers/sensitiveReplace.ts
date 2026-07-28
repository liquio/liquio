/**
 * Sensitive properties replace. Entries in `excludeParams` ending with "=" are treated as
 * query-string parameter names (e.g. "client_secret=") and mask everything up to the next
 * "&" or closing quote; all other entries mask the value of a matching JSON string field.
 * @param {string} targetObject
 * @param {array} excludeParams
 * @param {string} replaceMask
 * @returns
 */
export const sensitiveReplace = (targetObject, excludeParams = [], replaceMask = '****') => {
  if (typeof targetObject !== 'string' || !excludeParams.length) {
    return targetObject;
  }

  const jsonParams = excludeParams.filter((param) => !param.endsWith('='));
  const queryParams = excludeParams.filter((param) => param.endsWith('='));

  let resultString = targetObject;

  if (jsonParams.length) {
    const regex = new RegExp(`"(${jsonParams.join('|')})": ?"(.+?)"`, 'gmi');
    const matches = [...resultString.matchAll(regex)];
    matches.forEach(([stringToReplace, , value]) => {
      resultString = resultString.replace(stringToReplace, stringToReplace.replace(value, replaceMask));
    });
  }

  if (queryParams.length) {
    const regex = new RegExp(`(${queryParams.join('|')})[^&"]*`, 'gm');
    const matches = [...resultString.matchAll(regex)];
    matches.forEach(([stringToReplace, value]) => {
      resultString = resultString.replace(stringToReplace, `${value}${replaceMask}`);
    });
  }

  return resultString;
};
