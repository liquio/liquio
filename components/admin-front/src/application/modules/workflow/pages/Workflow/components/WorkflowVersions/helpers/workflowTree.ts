import objectPath from 'object-path';
import diff from 'helpers/diff';

interface TemplateItem {
  id?: unknown;
  jsonSchema?: unknown;
  htmlTemplate?: unknown;
}

interface TreeNode {
  id: string;
  name?: string;
  type?: string;
  data?: unknown;
  compare?: unknown;
  children?: (TreeNode | null)[];
}

interface VersionLike {
  name?: string;
  data?: {
    workflowTemplate?: { xmlBpmnSchema?: unknown };
    documentTemplates?: TemplateItem[];
    eventTemplates?: TemplateItem[];
    gatewayTemplates?: TemplateItem[];
    taskTemplates?: TemplateItem[];
  };
}

export default (version: VersionLike | undefined, { t, compare }: { t: (key: string) => string; compare?: VersionLike }) => {
  const jsonSchemaItemArray = (path: string, version: VersionLike | undefined, compare: VersionLike | undefined, prefix: string): TreeNode[] => {
    const versionArray = objectPath.get(version as object, path, []) as TemplateItem[];
    const compareArray = objectPath.get(compare as object, path, []) as TemplateItem[];

    return (versionArray
      .map((item) => {
        const compareItem = compareArray.find(({ id }) => item.id === id);
        const children: TreeNode[] = [];

        if (diff(item.jsonSchema, compareItem?.jsonSchema)) {
          children.push({
            type: 'json',
            id: prefix + '-' + item.id + '/jsonSchema',
            name: t('JsonSchema'),
            data: item.jsonSchema && JSON.stringify(item.jsonSchema, null, 4),
            compare:
              compareItem?.jsonSchema &&
              JSON.stringify(compareItem?.jsonSchema, null, 4),
          });
        }

        if (diff(item.htmlTemplate, compareItem?.htmlTemplate)) {
          children.push({
            type: 'html',
            id: prefix + '-' + item.id + '/htmlTemplate',
            name: t('HtmlTemplate'),
            data: item.htmlTemplate,
            compare: compareItem?.htmlTemplate,
          });
        }

        return children.length
          ? {
              id: prefix + '-' + item.id,
              name: prefix + '-' + item.id,
              children,
            }
          : null;
      })
      .filter(Boolean) as TreeNode[])
      .concat(
        compareArray
          .filter(
            ({ id: compareId }) =>
              !versionArray.find(({ id }) => id === compareId),
          )
          .map((compareItem) => ({
            id: prefix + '-' + compareItem.id,
            name: prefix + '-' + compareItem.id,
            children: [
              {
                type: 'json',
                id: prefix + '-' + compareItem.id + '/jsonSchema',
                name: t('JsonSchema'),
                data: '',
                compare:
                  compareItem?.jsonSchema &&
                  JSON.stringify(compareItem?.jsonSchema, null, 4),
              },
              {
                type: 'html',
                id: prefix + '-' + compareItem.id + '/htmlTemplate',
                name: t('HtmlTemplate'),
                data: '',
                compare: compareItem?.htmlTemplate,
              },
            ],
          }) as TreeNode),
      );
  };

  return {
    id: 'root',
    name: version?.name || t('Workflow'),
    children: [
      {
        id: 'workflowTemplate',
        name: t('WorkflowTemplate'),
        type: 'schema',
        data: version?.data?.workflowTemplate?.xmlBpmnSchema,
        compare: compare?.data?.workflowTemplate?.xmlBpmnSchema,
      },
      {
        id: 'documentTemplates',
        name: t('DocumentTemplates'),
        children: jsonSchemaItemArray(
          'data.documentTemplates',
          version,
          compare,
          'document',
        ),
      },
      {
        id: 'eventTemplates',
        name: t('EventTemplates'),
        children: jsonSchemaItemArray(
          'data.eventTemplates',
          version,
          compare,
          'event',
        ),
      },
      {
        id: 'gatewayTemplates',
        name: t('GatewayTemplates'),
        children: jsonSchemaItemArray(
          'data.gatewayTemplates',
          version,
          compare,
          'gateway',
        ),
      },
      {
        id: 'taskTemplates',
        name: t('TaskTemplates'),
        children: jsonSchemaItemArray(
          'data.taskTemplates',
          version,
          compare,
          'task',
        ),
      },
    ].filter(
      ({ id, children }: { id: string; children?: unknown[] }) => id === 'workflowTemplate' || children?.length,
    ),
  };
};
