import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

export default (str) => str.split('_').map(capitalizeFirstLetter).join('');
