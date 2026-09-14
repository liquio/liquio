import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

import * as elements from '../elements';

interface SchemaValue {
  control?: string;
  type?: string;
  snippet?: string;
}

export default (value: SchemaValue = {}, path: unknown[] = []) => {
  if (!path.length) {
    return elements.Board;
  }
  const { control, type, snippet } = value;
  const name = control || type + '.element';
  const elementName =
    snippet || name.split('.').map((part) => capitalizeFirstLetter(part)).join('');

  return (
    (elements as unknown as Record<string, unknown>)[elementName] ||
    elements.ObjectElement
  );
};
