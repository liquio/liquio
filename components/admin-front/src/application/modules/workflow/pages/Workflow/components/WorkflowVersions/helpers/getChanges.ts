import objectPath from 'object-path';

import eventDataMap from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/dataMapping/eventDataMap';
import gatewayDataMap from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/dataMapping/gatewayDataMap';
import taskDataMap from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/dataMapping/taskDataMap';

import diff from 'helpers/diff';

interface TemplateItem {
  id?: unknown;
  [key: string]: unknown;
}

interface VersionLike {
  data?: {
    workflowTemplate?: { id?: unknown; [key: string]: unknown };
    eventTemplates?: TemplateItem[];
    gatewayTemplates?: TemplateItem[];
    taskTemplates?: TemplateItem[];
  };
}

type MapDataFn = (item: TemplateItem | undefined, version: VersionLike | undefined, params: { workflowId: unknown }) => Record<string, unknown> | null | undefined;

export default (currentVersion: VersionLike | undefined, revertVersion: VersionLike | undefined, { t, workflowId }: { t: (key: string) => string; workflowId: unknown }) => {
  if (!currentVersion || !revertVersion) {
    return;
  }

  const jsonSchemaItemArray = (path: string, current: VersionLike, revert: VersionLike, type: string, mapData: MapDataFn) => {
    const currentArray = objectPath.get(current as object, path, []) as TemplateItem[];
    const revertArray = objectPath.get(revert as object, path, []) as TemplateItem[];

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
      eventDataMap as MapDataFn,
    ),
    ...jsonSchemaItemArray(
      'data.gatewayTemplates',
      currentVersion,
      revertVersion,
      'gateway',
      gatewayDataMap as unknown as MapDataFn,
    ),
    ...jsonSchemaItemArray(
      'data.taskTemplates',
      currentVersion,
      revertVersion,
      'task',
      taskDataMap as MapDataFn,
    ),
  ].filter((props) => {
    const { data, revert } = props as { data?: Record<string, unknown>; revert?: Record<string, unknown> };

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
