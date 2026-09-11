import objectPath from 'object-path';
import evaluate from 'helpers/evaluate';
import promiseChain from 'helpers/promiseChain';

export default async (triggers, props) => {
  let { dataPath, documentData } = props;

  const triggerActions = [];

  (triggers || []).forEach((trigger) => {
    const { action } = trigger;

    if (!action || !trigger.source || !trigger.target) {
      return;
    }

    let shouldExecuteAction = false;
    const targets = [];
    const params = {};

    [].concat(trigger.source).forEach((source) => {
      const pathElements = dataPath.split('.');
      const sourcePath = source
        .split('.')
        .map((element, index) => {
          if (/\$\{.+?}/.test(element)) {
            params[element] = pathElements[index];
            return pathElements[index];
          }
          return element;
        })
        .join('.');

      if (dataPath === sourcePath) {
        shouldExecuteAction = true;
      }
    });

    if (shouldExecuteAction) {
      [].concat(trigger.target).forEach((target) => {
        let targetPath = Object.keys(params).reduce(
          (acc, key) => acc.replace(key, params[key]),
          target,
        );
        targets.push(targetPath);
      });

      const calculateFunc = Object.keys(params).reduce((acc, key) => {
        const regexp = new RegExp(
          key.replace('$', '\\$').replace('{', '\\{').replace('}', '\\}'),
          'g',
        );
        return acc.replace(regexp, params[key]);
      }, action);

      triggerActions.push({
        props,
        targets,
        calculateFunc,
        action: () => evaluate(calculateFunc, props),
      });
    }
  });

  await promiseChain(
    triggerActions.map(
      ({ props, targets, calculateFunc, action }) =>
        async () => {
          try {
            const result = await action();
            let value =
              typeof result !== 'boolean' && typeof result !== 'number'
                ? result || undefined
                : result;

            targets.forEach((targetPath) => {
              console.log('handle action trigger', targetPath, value);
              documentData = JSON.parse(JSON.stringify(documentData));
              objectPath.set(documentData, targetPath, value);
            });
          } catch (error) {
            console.error('trigger error', {
              error,
              props,
              targets,
              calculateFunc,
            });
          }
        },
    ),
  );

  return documentData;
};
