import { ChangeEvent } from 'components/JsonSchema';

const stringify = (value) =>
  value.name || value.label || value.stringified || JSON.stringify(value);

export default (props) => {
  let { value } = props;
  if (value instanceof ChangeEvent) {
    value = value.data;
  }

  if (Array.isArray(value)) {
    value = [].concat(value).filter(Boolean).map(stringify).join();
  }

  if (typeof value === 'object') {
    while (typeof value === 'object') {
      value = stringify(value);
    }
  }

  return value;
};
