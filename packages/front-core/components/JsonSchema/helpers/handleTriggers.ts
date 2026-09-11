/*eslint-disable no-template-curly-in-string*/
import objectPath from 'object-path';
import evaluate from 'helpers/evaluate';
import EvaluateError from 'helpers/evaluate/EvaluateError';
import deleteDocumentAttaches from './deleteDocumentAttaches';
import sha256 from 'js-sha256';

interface CalcTrigger {
  calculate?: string;
  useSha256?: boolean;
  source?: string | string[];
  target?: string | string[];
}

const handleTriggers = (
  origin: Record<string, unknown> = {},
  triggers: CalcTrigger[] | undefined,
  dataPath: string,
  changesData: unknown,
  stepData: unknown,
  documentData: unknown,
  parentData: unknown,
  userInfo: unknown,
  taskSchema?: { jsonSchema?: unknown },
  activityLog?: unknown,
  indexPath?: string | number,
): Record<string, unknown> => {
  (triggers || []).forEach((trigger) => {
    const { calculate, useSha256 = false } = trigger;

    if (!calculate || !trigger.source || !trigger.target) {
      return;
    }

    ([] as string[]).concat(trigger.source as string | string[]).forEach((source) => {
      const params: Record<string, string> = {};
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

      if (dataPath !== sourcePath) {
        return;
      }

      ([] as string[]).concat(trigger.target as string | string[]).forEach((target) => {
        let indexCount = 0;
        const arrayPath = dataPath.split('.').map((element) => {
          return isNaN(element as unknown as number) ? element : Number(element);
        });
        const targetPath = Array.isArray(arrayPath)
          ? target.replace(/\${index}/g, () => {
              while (
                indexCount < arrayPath.length &&
                typeof arrayPath[indexCount] !== 'number'
              ) {
                indexCount++;
              }
              return String(
                indexCount < arrayPath.length
                  ? arrayPath[indexCount++]
                  : '',
              );
            })
          : target.replace('${index}', String(indexPath));

        const calculateFunc = Object.keys(params).reduce((acc, key) => {
          const regexp = new RegExp(
            key.replace('$', '\\$').replace('{', '\\{').replace('}', '\\}'),
            'g',
          );
          return acc.replace(regexp, params[key]);
        }, calculate);

        const result = evaluate(
          calculateFunc,
          changesData,
          stepData,
          documentData,
          parentData,
          userInfo,
          activityLog,
        );

        if (result instanceof Error) {
          console.error('trigger error', {
            sourcePath,
            targetPath,
            calculateFunc,
          });
          (result as EvaluateError).commit({
            type: 'calc trigger error',
            calculateFunc,
            targetPath,
          });
          return;
        }

        try {
          let value: unknown = result;

          if (typeof result !== 'boolean' && typeof result !== 'number') {
            value = result || undefined;
          }

          const copySource = JSON.parse(JSON.stringify(documentData));

          if (useSha256) {
            value = sha256(value as string);
          }

          console.log('handle trigger', sourcePath, targetPath, value);

          objectPath.set(origin, targetPath, value);

          deleteDocumentAttaches({
            taskSchema,
            documentData: copySource,
            documentDataModified: origin,
            targetPath,
          });
        } catch (e) {
          console.error('trigger error', e);
        }
      });
    });
  });

  return origin;
};

export default handleTriggers;
