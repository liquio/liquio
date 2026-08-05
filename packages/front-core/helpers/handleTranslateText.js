import objectPath from 'object-path';
import findPathDeep from 'deepdash/findPathDeep';

const handleTranslate = (translates, template) => {
  if (!translates) {
    return template;
  }

  try {
    translates.forEach((item) => {
      const { key, value } = item;

      const match = findPathDeep(
        template,
        (value) => `${value}`.indexOf(key) !== -1,
      );

      if (match) {
        const path = match.replace(/\[(\d+)\]/g, '.$1');

        const source = objectPath.get(template, path);

        if (source) {
          const translation = source.replace(key, value);

          objectPath.set(template, path, translation);
        }
      }
    });

    return template;
  } catch (error) {
    return template;
  }
};

export default handleTranslate;
