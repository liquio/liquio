import { defaultHtml } from 'components/CodeEditDialog';

interface TaskEntity {
  documentTemplateEntity: { htmlTemplate?: string; [key: string]: unknown };
  taskTemplateEntity: { htmlTemplate?: string; jsonSchemaRaw?: string; [key: string]: unknown };
  workflowTemplateId: string | number;
}

export const entityToBody = ({
  documentTemplateEntity,
  taskTemplateEntity,
  workflowTemplateId,
}: TaskEntity) => {
  try {
    documentTemplateEntity.htmlTemplate =
      documentTemplateEntity.htmlTemplate || defaultHtml(true);
  } catch {
    // nothing to do;
  }

  try {
    taskTemplateEntity.htmlTemplate =
      taskTemplateEntity.htmlTemplate || defaultHtml(true);
    taskTemplateEntity.jsonSchemaRaw = '';
  } catch {
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
