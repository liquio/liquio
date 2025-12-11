import { defaultHtml } from 'components/CodeEditDialog';

export const entityToBody = ({
  documentTemplateEntity,
  taskTemplateEntity,
  workflowTemplateId,
}) => {
  try {
    documentTemplateEntity.htmlTemplate =
      documentTemplateEntity.htmlTemplate || defaultHtml(true);
  } catch (e) {
    // nothing to do;
  }

  try {
    taskTemplateEntity.htmlTemplate =
      taskTemplateEntity.htmlTemplate || defaultHtml(true);
    taskTemplateEntity.jsonSchemaRaw = '';
  } catch (e) {
    // nothing to do;
  }

  return {
    documentTemplate: documentTemplateEntity,
    taskTemplate: taskTemplateEntity,
    workflowTemplateId,
  };
};

export default {
  entityToBody,
};
