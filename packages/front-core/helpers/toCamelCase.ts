import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

export default (str: string): string => str.split('_').map((part) => capitalizeFirstLetter(part)).join('');
