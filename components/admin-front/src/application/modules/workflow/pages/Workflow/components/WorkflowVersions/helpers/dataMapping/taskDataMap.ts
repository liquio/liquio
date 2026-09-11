/* eslint-disable no-sequences */
interface DocumentTemplate {
  id?: unknown;
  [key: string]: unknown;
}

interface TaskTemplate {
  documentTemplateId?: unknown;
  [key: string]: unknown;
}

interface VersionData {
  data?: { documentTemplates?: DocumentTemplate[] };
}

export default (task: TaskTemplate | null | undefined, version: VersionData | undefined, { workflowId }: { workflowId: unknown }) => {
  if (!task) {
    return null;
  }

  const documentTemplate =
    (version?.data?.documentTemplates || []).find(
      ({ id }) => id === task?.documentTemplateId,
    ) || {};

  return {
    documentTemplateEntity: documentTemplate,
    taskTemplateEntity: task,
    workflowTemplateId: workflowId,
  };
};
