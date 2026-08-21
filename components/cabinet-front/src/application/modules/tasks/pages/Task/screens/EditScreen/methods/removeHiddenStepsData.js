import objectPath from 'object-path';
import findPathDeep from 'deepdash/findPathDeep';

import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';

export default async function removeHiddenStepsData() {
  const { actions, setBusy } = this.props;
  const {
    steps,
    taskId,
    task,
    template: {
      jsonSchema: { properties }
    }
  } = propsToData(this.props);

  const allSteps = Object.keys(properties) || [];

  if (steps.length === allSteps.length) return;

  const stepToDelete = allSteps
    .map((stepName) => ({
      stepName,
      ...properties[stepName]
    }))
    .filter(({ clearWhenHidden }) => clearWhenHidden)
    .map(({ stepName }) => stepName);

  if (!stepToDelete || !stepToDelete.length) return;

  const documentDataSaved = { ...task.document.data };

  stepToDelete.forEach((step) => {
    if (!steps.includes(step)) {
      const controls = properties[step].properties;

      Object.keys(controls)
        .map((control) => {
          const selectFilesPath = findPathDeep(
            controls[control],
            (value) => value === 'select.files'
          );
          if (!selectFilesPath) return false;
          const path = `${step}.${control}.${selectFilesPath}`;
          return path.replace('.control', '');
        })
        .filter(Boolean)
        .forEach((controlPath) => {
          const isArray =
            controlPath.indexOf('properties') !== -1 && controlPath.indexOf('items') !== -1;

          const getArrayPath = (str) => {
            const arr = str.split('.');
            const fieldName = arr.pop();
            const path = arr.join('.').replace('.properties', '').replace('.items', '');
            return { path, fieldName };
          };

          const makeRequest = async ({ documentId, id }) => {
            setBusy(true);
            await actions.deleteDocumentAttach({ documentId, id });
            setBusy(false);
          };

          const dataPath = isArray ? getArrayPath(controlPath).path : controlPath;

          const controlData = objectPath.get(task.document.data, dataPath);

          if (!controlData) return;

          controlData.forEach((data) => {
            if (isArray) {
              const { fieldName } = getArrayPath(controlPath);

              (data[fieldName] || []).forEach((file) => {
                if (!file) return;
                this.queue.push(() => makeRequest(file));
              });
              return;
            }
            this.queue.push(() => makeRequest(data));
          });
        });

      const stepData = objectPath.get(task.document.data, step);

      if (!stepData) return;

      documentDataSaved[step] = undefined;
    }
  });

  actions.setTaskDocumentValues(taskId, documentDataSaved);
}
