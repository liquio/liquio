import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

export default (str) =>
  str
    .split(' ')
    .map((word) => capitalizeFirstLetter(word))
    .join(' ');
