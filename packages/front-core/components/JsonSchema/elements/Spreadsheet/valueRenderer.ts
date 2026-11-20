import { ChangeEvent } from 'components/JsonSchema';

interface Stringifiable {
  name?: string;
  label?: string;
  stringified?: string;
}

const stringify = (value: Stringifiable): string =>
  value?.name || value?.label || value?.stringified || JSON.stringify(value);

export default (props: { value: unknown }): unknown => {
  let { value } = props;
  if (value instanceof ChangeEvent) {
    value = (value as InstanceType<typeof ChangeEvent>).data;
  }

  if (Array.isArray(value)) {
    value = ([] as unknown[]).concat(value).filter(Boolean).map((item) => stringify(item as Stringifiable)).join();
  }

  if (typeof value === 'object' && value !== null) {
    value = stringify(value as Stringifiable);
  }

  return value;
};
