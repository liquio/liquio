import objectPath from 'object-path';
import findPathDeep from 'deepdash/findPathDeep';

interface TranslateItem {
  key: string;
  value: string;
}

const handleTranslate = <T>(translates: TranslateItem[] | null | undefined, template: T): T => {
  if (!translates) {
    return template;
  }

  try {
    translates.forEach((item) => {
      const { key, value } = item;

      const match = findPathDeep(template, (v) => `${v}`.indexOf(key) !== -1);

      if (match) {
        const path = match.replace(/\[(\d+)\]/g, '.$1');

        const source = objectPath.get(template, path);

        if (source) {
          const translation = (source as string).replace(key, value);

          objectPath.set(template, path, translation);
        }
      }
    });

    return template;
  } catch {
    return template;
  }
};

export default handleTranslate;
