import objectPath from 'object-path';
import evaluate from 'helpers/evaluate';
import promiseChain from 'helpers/promiseChain';

interface ActionTrigger {
  action?: string;
  source?: string | string[];
  target?: string | string[];
}

interface TriggerActionEntry {
  props: unknown;
  targets: string[];
  calculateFunc: string;
  action: () => unknown;
}

export default async (triggers: ActionTrigger[] | undefined, props: { dataPath: string; documentData: unknown }): Promise<unknown> => {
  let { dataPath, documentData } = props;

  const triggerActions: TriggerActionEntry[] = [];

  (triggers || []).forEach((trigger) => {
    const { action } = trigger;

    if (!action || !trigger.source || !trigger.target) {
      return;
    }

    let shouldExecuteAction = false;
    const targets: string[] = [];
    const params: Record<string, string> = {};

    ([] as string[]).concat(trigger.source as string | string[]).forEach((source) => {
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
      ([] as string[]).concat(trigger.target as string | string[]).forEach((target) => {
        const targetPath = Object.keys(params).reduce(
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
            const value =
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
