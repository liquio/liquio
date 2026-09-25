/*eslint-disable no-template-curly-in-string*/
import objectPath from 'object-path';
import isEqual from 'lodash/isEqual';
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

type PlainObject = Record<string, unknown>;

interface TriggerContextValue {
  triggerValue: unknown;
  cleanupKeys: string[];
}

const isEmptySourceValue = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as PlainObject).length === 0;
  return false;
};

const sourceValuesEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  const aEmpty = isEmptySourceValue(a);
  const bEmpty = isEmptySourceValue(b);
  if (aEmpty || bEmpty) return aEmpty && bEmpty;
  return isEqual(a, b);
};

const isPlainObject = (value: unknown): value is PlainObject =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const buildIndexedHybridValue = ({
  sourceValue,
  sourceParentValue,
  sourceField,
}: {
  sourceValue: unknown;
  sourceParentValue: unknown;
  sourceField: string;
}): TriggerContextValue => {
  if (!isPlainObject(sourceValue) || !isPlainObject(sourceParentValue)) {
    return { triggerValue: sourceValue, cleanupKeys: [] };
  }

  const cleanupKeys: string[] = [];

  Object.keys(sourceParentValue).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(sourceValue, key)) {
      return;
    }

    try {
      Object.defineProperty(sourceValue, key, {
        get: () => sourceParentValue[key],
        configurable: true,
        enumerable: false,
      });
      cleanupKeys.push(key);
    } catch {
      // ignore non-extensible values
    }
  });

  if (sourceField && !Object.prototype.hasOwnProperty.call(sourceValue, sourceField)) {
    try {
      Object.defineProperty(sourceValue, sourceField, {
        value: sourceValue,
        configurable: true,
        enumerable: false,
        writable: true,
      });
      cleanupKeys.push(sourceField);
    } catch {
      // ignore non-extensible values
    }
  }

  return {
    triggerValue: sourceValue,
    cleanupKeys,
  };
};

const buildTriggerContextValue = ({
  isIndexedSource,
  sourceValue,
  sourceParentValue,
  sourceField,
}: {
  isIndexedSource: boolean;
  sourceValue: unknown;
  sourceParentValue: unknown;
  sourceField: string;
}): TriggerContextValue => {
  if (isIndexedSource && isPlainObject(sourceParentValue)) {
    if (isPlainObject(sourceValue)) {
      return buildIndexedHybridValue({
        sourceValue,
        sourceParentValue,
        sourceField,
      });
    }

    return {
      triggerValue: sourceValue,
      cleanupKeys: [],
    };
  }

  if (isPlainObject(sourceValue)) {
    return {
      triggerValue: {
        ...sourceValue,
        [sourceField]: sourceValue,
      },
      cleanupKeys: [],
    };
  }

  return { triggerValue: sourceValue, cleanupKeys: [] };
};

const cleanupHybridKeys = (sourceValue: unknown, cleanupKeys: string[] = []): void => {
  if (!isPlainObject(sourceValue) || !cleanupKeys.length) {
    return;
  }

  cleanupKeys.forEach((key) => {
    try {
      delete sourceValue[key];
    } catch {
      // ignore non-configurable keys
    }
  });
};

const PLACEHOLDER_REGEXP = /^\$\{.+?}$/;

const isPathRelated = (leftPath = '', rightPath = ''): boolean => {
  if (!leftPath || !rightPath) return false;
  return (
    leftPath === rightPath ||
    leftPath.startsWith(`${rightPath}.`) ||
    rightPath.startsWith(`${leftPath}.`)
  );
};

const canSourceTemplateMatchPath = (sourceTemplate = '', dataPath = ''): boolean => {
  const sourceSegments = sourceTemplate.split('.');
  const dataSegments = dataPath.split('.');
  const length = Math.min(sourceSegments.length, dataSegments.length);

  for (let index = 0; index < length; index++) {
    const sourceSegment = sourceSegments[index];
    const dataSegment = dataSegments[index];

    if (PLACEHOLDER_REGEXP.test(sourceSegment)) {
      continue;
    }

    if (sourceSegment !== dataSegment) {
      return false;
    }
  }

  return true;
};

const buildSourcePaths = ({
  sourceTemplate,
  dataPath,
  documentData,
}: {
  sourceTemplate: string;
  dataPath: string;
  documentData: unknown;
}): string[] => {
  if (!sourceTemplate || !dataPath) {
    return [];
  }

  if (!canSourceTemplateMatchPath(sourceTemplate, dataPath)) {
    return [];
  }

  const sourceSegments = sourceTemplate.split('.');
  const dataSegments = dataPath.split('.');
  let paths: string[][] = [[]];

  sourceSegments.forEach((segment, index) => {
    if (!PLACEHOLDER_REGEXP.test(segment)) {
      paths = paths.map((pathSegments) => pathSegments.concat(segment));
      return;
    }

    const nextPaths: string[][] = [];

    paths.forEach((pathSegments) => {
      const parentPath = pathSegments.join('.');
      const parentValue = objectPath.get(documentData as PlainObject, parentPath);
      const dataSegment = dataSegments[index];
      const indexesFromPath =
        dataSegment !== undefined && !Number.isNaN(Number(dataSegment))
          ? [String(Number(dataSegment))]
          : [];
      const indexesFromValue = Array.isArray(parentValue)
        ? parentValue.map((_, itemIndex) => String(itemIndex))
        : parentValue && typeof parentValue === 'object'
          ? Object.keys(parentValue).filter((key) => !Number.isNaN(Number(key)))
          : [];
      const indexes = indexesFromPath.length ? indexesFromPath : indexesFromValue;

      indexes.forEach((currentIndex) => {
        nextPaths.push(pathSegments.concat(currentIndex));
      });
    });

    paths = nextPaths;
  });

  return paths.map((pathSegments) => pathSegments.join('.'));
};

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
  previousDocumentData?: unknown,
  indexPath?: string | number,
): Record<string, unknown> => {
  // changesData is kept in the signature for existing callers: the trigger value is read from documentData at sourcePath.
  void changesData;

  (triggers || []).forEach((trigger) => {
    const { calculate, useSha256 = false } = trigger;

    if (!calculate || !trigger.source || !trigger.target) {
      return;
    }

    ([] as string[]).concat(trigger.source).forEach((source) => {
      const sourcePaths = buildSourcePaths({
        sourceTemplate: source,
        dataPath,
        documentData,
      });

      sourcePaths.forEach((sourcePath) => {
        if (!isPathRelated(dataPath, sourcePath)) {
          return;
        }

        const sourceTemplateElements = source.split('.');
        const sourcePathElements = sourcePath.split('.');
        const params = sourceTemplateElements.reduce<Record<string, string>>((acc, element, index) => {
          if (PLACEHOLDER_REGEXP.test(element)) {
            return {
              ...acc,
              [element]: sourcePathElements[index],
            };
          }
          return acc;
        }, {});

        ([] as string[]).concat(trigger.target as string | string[]).forEach((target) => {
          let indexCount = 0;
          const targetPath = target.replace(/\${index}/g, () => {
            while (
              indexCount < sourcePathElements.length &&
              Number.isNaN(Number(sourcePathElements[indexCount]))
            ) {
              indexCount++;
            }

            // With too few source indexes this yields String(indexPath), i.e. "undefined" when absent (kept on purpose).
            return indexCount < sourcePathElements.length
              ? sourcePathElements[indexCount++]
              : (indexPath as string);
          });

          const calculateFunc = Object.keys(params).reduce((acc, key) => {
            const regexp = new RegExp(key.replace('$', '\\$').replace('{', '\\{').replace('}', '\\}'), 'g');
            return acc.replace(regexp, params[key]);
          }, calculate);

          const sourceValue = objectPath.get(documentData as PlainObject, sourcePath);
          if (previousDocumentData) {
            const previousSourceValue = objectPath.get(previousDocumentData as PlainObject, sourcePath);
            if (sourceValuesEqual(previousSourceValue, sourceValue)) {
              return;
            }
          }

          const sourceField = sourcePathElements[sourcePathElements.length - 1];
          const sourceParentPath = sourcePathElements.slice(0, -1).join('.');
          const sourceParentValue = objectPath.get(documentData as PlainObject, sourceParentPath);
          const isIndexedSource = source.includes('${index}');

          const { triggerValue, cleanupKeys } = buildTriggerContextValue({
            isIndexedSource,
            sourceValue,
            sourceParentValue,
            sourceField,
          });

          const result = evaluate(
            calculateFunc,
            triggerValue,
            stepData,
            documentData,
            parentData,
            userInfo,
            activityLog,
          );

          cleanupHybridKeys(sourceValue, cleanupKeys);

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
  });

  return origin;
};

export default handleTriggers;
