import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

export default (str: string): string =>
  str
    .split(' ')
    .map((word) => capitalizeFirstLetter(word))
    .join(' ');
