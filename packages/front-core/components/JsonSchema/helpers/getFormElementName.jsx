import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

export default ({ control, type } = {}) => {
  if (!control && !type) {
    return null;
  }

  const name = control || type + '.element';
  return name.split('.').map(capitalizeFirstLetter).join('');
};
