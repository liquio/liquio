import objectPath from 'object-path';
import cleanDeep from 'clean-deep';
import store from 'store';
import { ChangeEvent, handleTriggers } from 'components/JsonSchema';
import addParent from 'helpers/addParentField';
import { JsonSchemaNode } from '../types';

interface CleanProperties {
  emptyObjects?: boolean;
  emptyArrays?: boolean;
  nullValues?: boolean;
  [key: string]: unknown;
}

export default (
    origin: Record<string, unknown> = {},
    handleChange?: (documentData: unknown, meta: { dataPath: string; changes: unknown }) => void,
    clean = false,
    jsonSchema: JsonSchemaNode & { calcTriggers?: unknown } = {},
    props?: { clean?: CleanProperties },
  ) =>
  (...path: Array<string | number | unknown>) => {
    const changes = path.pop();
    const dataPath = path.join('.');
    const {
      auth: { info },
    } = store.getState() || {};

    const cleanProperties: CleanProperties = {
      emptyObjects: false,
      emptyArrays: false,
      nullValues: false,
      ...(props?.clean || {}),
    };

    const changesData = changes instanceof ChangeEvent ? changes.data : changes;
    try {
      let documentData = JSON.parse(JSON.stringify(origin));
      if (clean) {
        documentData = cleanDeep(documentData, cleanProperties);
      }

      const parentPath = path.filter((el, index) => index < path.length - 1);

      addParent(path as (string | number)[], documentData);
      objectPath.set(documentData, path as string[], changesData);
      const parentData = objectPath.get(documentData, parentPath as string[]);

      jsonSchema.calcTriggers &&
        handleTriggers(
          documentData,
          jsonSchema.calcTriggers as Parameters<typeof handleTriggers>[1],
          dataPath,
          changesData,
          documentData[path[0] as string],
          documentData,
          parentData,
          null,
          // Positionally this lands in handleTriggers' `taskSchema` parameter, not
          // `userInfo` (already consumed by the preceding `null`) — preserved as-is.
          info as { jsonSchema?: unknown } | undefined,
        );

      if (clean) {
        documentData = cleanDeep(documentData, cleanProperties);
      }

      handleChange &&
        handleChange(documentData, {
          dataPath,
          changes,
        });
    } catch (e) {
      // Note: original silently swallows all errors here with an empty
      // catch block — preserved as-is.
      void e;
    }
  };
