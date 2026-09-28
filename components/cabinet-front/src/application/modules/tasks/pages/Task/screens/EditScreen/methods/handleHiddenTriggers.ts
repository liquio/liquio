/* eslint-disable @typescript-eslint/no-explicit-any */
import objectPath from 'object-path';

import getDeltaProperties from 'helpers/getDeltaProperties';
import { handleTriggers } from 'components/JsonSchema';
import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';

function flatten(arr: any[]): any[] {
  return arr.reduce(
    (flat: any[], toFlatten: any) => flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten),
    [] as any[]
  );
}

export default async function handleHiddenTriggers(this: any, pathOrigin: string[]): Promise<void> {
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

  const scipLooping = (item: string) =>
    called.includes(item) ||
    !flatten(triggers.map(({ source }: any) => source).filter(Boolean)).includes(item);

  async function recursion(properties: any[]): Promise<void> {
    properties.forEach(({ path, value }: any) => {
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

  void recursion(propertiesOrigin);

  if (!Object.keys(data).length) return;

  await actions.setTaskDocumentValues(taskId, data);
}
