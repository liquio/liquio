import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

import * as elements from '../elements';

export default (value = {}, path = []) => {
  if (!path.length) {
    return elements.Board;
  }
  const { control, type, snippet } = value;
  const name = control || type + '.element';
  const elementName =
    snippet || name.split('.').map(capitalizeFirstLetter).join('');

  return elements[elementName] || elements.ObjectElement;
};
