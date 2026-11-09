export enum ErrorMessage {
  DocumentAlreadyCommitted = 'Document has already been committed.',
  DraftExpired = 'Draft is already expired.',
  UpdateDocument = "Can't update document.",
  CanNotDelete = "Can't delete.",

  WorkflowTemplateNotFound = 'Workflow template not found.',
  WorkflowNotFound = 'Workflow not found.',
  TaskTemplateNotFound = 'Task template not found.',
  TaskNotFound = 'Task not found.',
  CreateTaskAccess = "User doesn't have access to create task.",
  DocumentTemplateNotFound = 'Document template not found.',
  DownloadTokenInvalid = 'Download token is invalid or expired.',
  DocumentNotFound = 'Document not found.',

  WorkflowAccess = "User doesn't have any access to workflow.",
}
