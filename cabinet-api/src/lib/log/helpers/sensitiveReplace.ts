/**
 * Sensitive properties replace
 * @param targetObject - The target object (usually JSON string)
 * @param excludeParams - Array of parameter names to mask
 * @param replaceMask - The mask string to replace sensitive values with
 * @returns The target object with sensitive values masked
 */
const DEFAULT_EXCLUDE_PARAMS = ['token', 'authorization', 'Authorization', 'oauth-token'];

const sensitiveReplace = (
  targetObject: string | Record<string, unknown>,
  excludeParams: string[] = DEFAULT_EXCLUDE_PARAMS,
  replaceMask: string = '****',
): string | Record<string, unknown> => {
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
