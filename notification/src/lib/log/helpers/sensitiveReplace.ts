/**
 * Sensitive properties replace
 * @param {string} targetObject
 * @param {array} excludeParams
 * @param {string} replaceMask
 * @returns
 */
const DEFAULT_EXCLUDE_PARAMS = ['token', 'authorization', 'Authorization', 'oauth-token'];

export function sensitiveReplace(targetObject: unknown, excludeParams: string[] = DEFAULT_EXCLUDE_PARAMS, replaceMask = '****'): unknown {
  if (typeof targetObject !== 'string') {
    return targetObject;
  }

  const regex = new RegExp(`"(${excludeParams.join('|')})": ?"(.+?)"`, 'gm');
  const matches = [...targetObject.matchAll(regex)];

  if (!matches.length) {
    return targetObject;
  }

  let resultString = targetObject;

  matches.forEach(([stringToReplace, , value]) => {
    resultString = resultString.replace(stringToReplace, stringToReplace.replace(value, replaceMask));
  });

  return resultString;
}
