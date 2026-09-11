import objectPath from 'object-path';
import cleanDeep from 'clean-deep';
import store from 'store';
import { ChangeEvent, handleTriggers } from 'components/JsonSchema';
import addParent from 'helpers/addParentField';

export default (
    origin = {},
    handleChange,
    clean = false,
    jsonSchema = {},
    props,
  ) =>
  (...path) => {
    const changes = path.pop();
    const dataPath = path.join('.');
    const {
      auth: { info },
    } = store.getState() || {};

    const cleanProperties = {
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

      addParent(path, documentData);
      objectPath.set(documentData, path, changesData);
      const parentData = objectPath.get(documentData, parentPath);

      jsonSchema.calcTriggers &&
        handleTriggers(
          documentData,
          jsonSchema.calcTriggers,
          dataPath,
          changesData,
          documentData[path[0]],
          documentData,
          parentData,
          null,
          info,
        );

      if (clean) {
        documentData = cleanDeep(documentData, cleanProperties);
      }

      handleChange &&
        handleChange(documentData, {
          dataPath,
          changes,
        });
    } catch (e) {}
  };
