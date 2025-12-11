import objectPath from 'object-path';

import eventDataMap from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/dataMapping/eventDataMap';
import gatewayDataMap from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/dataMapping/gatewayDataMap';
import taskDataMap from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/dataMapping/taskDataMap';

import diff from 'helpers/diff';

export default (currentVersion, revertVersion, { t, workflowId }) => {
  if (!currentVersion || !revertVersion) {
    return;
  }

  const jsonSchemaItemArray = (path, current, revert, type, mapData) => {
    const currentArray = objectPath.get(current, path, []);
    const revertArray = objectPath.get(revert, path, []);

    return currentArray
      .map((item) => ({
        type,
        id: item.id,
        name: type + '-' + item.id,
        data: mapData(item, currentVersion, { workflowId }),
        revert: mapData(
          revertArray.find(({ id }) => item.id === id),
          revertVersion,
          { workflowId },
        ),
      }))
      .concat(
        revertArray
          .filter(
            ({ id: revertId }) =>
              !currentArray.find(({ id }) => id === revertId),
          )
          .map((revertItem) => ({
            type,
            id: revertItem.id,
            name: type + '-' + revertItem.id,
            data: undefined,
            revert: mapData(revertItem, revertVersion, { workflowId }),
          })),
      );
  };

  return [
    {
      id: currentVersion?.data?.workflowTemplate?.id,
      name: t('WorkflowTemplate'),
      type: 'workflow',
      data: currentVersion?.data?.workflowTemplate,
      revert: revertVersion?.data?.workflowTemplate,
    },
    ...jsonSchemaItemArray(
      'data.eventTemplates',
      currentVersion,
      revertVersion,
      'event',
      eventDataMap,
    ),
    ...jsonSchemaItemArray(
      'data.gatewayTemplates',
      currentVersion,
      revertVersion,
      'gateway',
      gatewayDataMap,
    ),
    ...jsonSchemaItemArray(
      'data.taskTemplates',
      currentVersion,
      revertVersion,
      'task',
      taskDataMap,
    ),
  ].filter((props) => {
    const { data, revert } = props;

    if (data) {
      delete data.createdAtData;
      delete data.updatedAtData;
    }

    if (revert) {
      delete revert.createdAtData;
      delete revert.updatedAtData;
    }

    return diff(data, revert);
  });
};
