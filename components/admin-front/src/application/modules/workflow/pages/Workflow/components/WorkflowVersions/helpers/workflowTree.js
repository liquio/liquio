import objectPath from 'object-path';
import diff from 'helpers/diff';

export default (version, { t, compare }) => {
  const jsonSchemaItemArray = (path, version, compare, prefix) => {
    const versionArray = objectPath.get(version, path, []);
    const compareArray = objectPath.get(compare, path, []);

    return versionArray
      .map((item) => {
        const compareItem = compareArray.find(({ id }) => item.id === id);
        const children = [];

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
      .filter(Boolean)
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
          })),
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
      ({ id, children }) => id === 'workflowTemplate' || children?.length,
    ),
  };
};
