/**
 * Sensitive properties replace
 * @param {string} targetObject
 * @param {array} excludeParams
 * @param {string} replaceMask
 * @returns
 */
const sensitiveReplace = (targetObject, excludeParams = [], replaceMask = '****') => {
  if (typeof targetObject !== 'string') {
    return targetObject;
  }

  const regex = new RegExp(`"(${excludeParams.join('|')})": ?"(.+?)"`, 'gmi');
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

module.exports = sensitiveReplace;
