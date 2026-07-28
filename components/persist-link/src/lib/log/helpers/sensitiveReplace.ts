/**
 * Sensitive properties replace.
 * @param {string|object} targetObject The target object (usually JSON string).
 * @param {string[]} [excludeParams] Array of parameter names to mask.
 * @param {string} [replaceMask] The mask string to replace sensitive values with.
 * @returns {string|object} The target object with sensitive values masked.
 */
const DEFAULT_EXCLUDE_PARAMS = ['token', 'authorization', 'Authorization', 'oauth-token'];

const sensitiveReplace = (targetObject, excludeParams = DEFAULT_EXCLUDE_PARAMS, replaceMask = '****') => {
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
};

export default sensitiveReplace;
