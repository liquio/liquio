import { Entity } from './entity';

interface WorkflowTemplateEntityOptions {
  /** ID. */
  id: number;
  /** ID. */
  workflowTemplateCategoryId: number;
  /** Name. */
  name: string;
  /** Status. */
  description: string;
  /** XML BPMN Schema. */
  xmlBpmnSchema: string;
  /** Data. */
  data: object;
  /** Is active. */
  isActive: boolean;
  /** Workflow status ID. */
  workflowStatusId: number;
  /** Access units. */
  accessUnits: number[];
  errorsSubscribers: { id: string; email: string }[];
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
  meta?: object;
  tags?: string[];
}

interface WorkflowTemplateEntityAdditionalOptions {
  entryTaskTemplateIds?: number[];
  workflowTemplateCategory?: object;
  lastWorkflowHistory?: object;
}

/**
 * Workflow template entity.
 */
export class WorkflowTemplateEntity extends Entity<WorkflowTemplateEntityOptions, WorkflowTemplateEntityAdditionalOptions> {

  getFilterProperties(): (keyof WorkflowTemplateEntityOptions | keyof WorkflowTemplateEntityAdditionalOptions)[] {
    return [
      'id',
      'workflowTemplateCategoryId',
      'entryTaskTemplateIds',
      'workflowTemplateCategory',
      'name',
      'description',
      'xmlBpmnSchema',
      'data',
      'isActive',
      'workflowStatusId',
      'lastWorkflowHistory',
      'accessUnits',
      'errorsSubscribers',
      'createdAt',
      'updatedAt',
      'meta',
    ];
  }

  getFilterPropertiesBrief(): (keyof WorkflowTemplateEntityOptions | keyof WorkflowTemplateEntityAdditionalOptions)[] {
    return [
      'id',
      'workflowTemplateCategoryId',
      'entryTaskTemplateIds',
      'workflowTemplateCategory',
      'name',
      'description',
      'data',
      'isActive',
      'workflowStatusId',
      'accessUnits',
      'errorsSubscribers',
      'createdAt',
      'updatedAt',
      'meta',
    ];
  }
}

export interface WorkflowTemplateEntity extends WorkflowTemplateEntityOptions {};
