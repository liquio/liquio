import { Entity } from '../entities/entity';
import { TaskTemplateEntity } from '../entities/task_template';
import { DocumentTemplateEntity } from '../entities/document_template';

interface TaskGroupEntityOptions {
  /** Task template entity. */
  taskTemplateEntity: TaskTemplateEntity;
  /** Document template entity. */
  documentTemplateEntity: DocumentTemplateEntity;
}

/**
 * Task group entity.
 */
export class TaskGroupEntity extends Entity<TaskGroupEntityOptions> {
  constructor(options: TaskGroupEntityOptions) {
    super(options);

    const { taskTemplateEntity, documentTemplateEntity } = options;

    if (!(taskTemplateEntity instanceof TaskTemplateEntity)) {
      throw new Error('Must be instance of TaskTemplateEntity');
    }
    if (!(documentTemplateEntity instanceof DocumentTemplateEntity)) {
      throw new Error('Must be instance of DocumentTemplateEntity');
    }

    this.taskTemplateEntity = taskTemplateEntity;
    this.documentTemplateEntity = documentTemplateEntity;
  }
}

export interface TaskGroupEntity extends TaskGroupEntityOptions { }
