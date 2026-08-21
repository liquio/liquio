import objectPath from 'object-path';

import getDeltaProperties from 'helpers/getDeltaProperties';
import { handleTriggers } from 'components/JsonSchema';
import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';

function flatten(arr) {
  return arr.reduce(
    (flat, toFlatten) => flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten),
    []
  );
}

export default async function handleHiddenTriggers(pathOrigin) {
  const {
    task,
    taskId,
    origin,
    template: { jsonSchema }
  } = propsToData(this.props);
  const { userInfo, stepId, actions } = this.props;

  const triggers = jsonSchema.calcTriggers || [];

  const propertiesOrigin = getDeltaProperties(task.document.data, origin.document.data);

  if (!propertiesOrigin.length || !triggers.length) return;

  const called = [pathOrigin.join('.')];
  let data = {};

  const scipLooping = (item) =>
    called.includes(item) ||
    !flatten(triggers.map(({ source }) => source).filter(Boolean)).includes(item);

  async function recursion(properties) {
    return properties.forEach(({ path, value }) => {
      if (scipLooping(path)) return;

      const pathArr = path.split('.');
      const parentPath = pathArr.slice(0, pathArr.length - 1);
      const parentData = objectPath.get(task.document.data, parentPath);

      called.push(path);

      data = handleTriggers(
        task.document.data,
        triggers,
        path,
        value,
        task.document.data[stepId],
        task.document.data,
        parentData,
        userInfo
      );

      const propertiesAfter = getDeltaProperties(data, origin.document.data);

      recursion(propertiesAfter);
    });
  }

  (async () => await recursion(propertiesOrigin))();

  if (!Object.keys(data).length) return;

  await actions.setTaskDocumentValues(taskId, data);
}
