import objectPath from 'object-path';
import evaluate from 'helpers/evaluate';

interface MessageConfig {
  show?: string;
  [key: string]: unknown;
}

export default (
  { getMessage }: { getMessage?: MessageConfig | MessageConfig[] } = {},
  path: (string | number)[],
  { value, rootDocument }: { value: unknown; rootDocument: { data: Record<string, unknown> } },
): Array<Omit<MessageConfig, 'show'>> => {
  if (!getMessage) {
    return [];
  }

  const [stepName] = path;

  return ([] as MessageConfig[])
    .concat(getMessage)
    .map(({ show, ...rest }) => {
      if (
        evaluate(
          show as string,
          value,
          rootDocument.data[stepName],
          rootDocument.data,
          objectPath.get(rootDocument.data, path.slice(0, path.length - 1) as string[]),
        )
      ) {
        return rest;
      }
      return null;
    })
    .filter((item): item is Omit<MessageConfig, 'show'> => Boolean(item));
};
