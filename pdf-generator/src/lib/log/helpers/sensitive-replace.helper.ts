export const sensitiveReplace = (
  targetObjectString: string,
  excludeParams: string[] = [],
  replaceMask = '****',
): string => {
  const regex = new RegExp(`"(${excludeParams.join('|')})": ?"(.+?)"`, 'gm');
  const matches = [...targetObjectString.matchAll(regex)];

  if (!matches.length) {
    return targetObjectString;
  }

  const resultString = matches.reduce((acc: string, current: RegExpExecArray) => {
    const [stringToReplace, , value] = current;
    return acc.replace(stringToReplace, stringToReplace.replace(value, replaceMask));
  }, targetObjectString);

  return resultString;
};
