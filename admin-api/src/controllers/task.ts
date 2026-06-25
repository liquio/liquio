import { matchedData } from 'express-validator';

import { Exceptions } from '../exceptions';
import { Controller } from './controller';
import { TaskBusiness } from '../businesses/task';
import { WorkflowBusiness } from '../businesses/workflow';
import { BpmnWorkflowBusiness } from '../businesses/bpmn_workflow';
import { TaskGroupEntity } from '../entities/task_group';
import { TaskTemplateEntity } from '../entities/task_template';
import { DocumentTemplateEntity } from '../entities/document_template';

/**
 * Task controller.
 */
export class TaskController extends Controller {
  private static singleton: TaskController;

  private taskBusiness: TaskBusiness;
  private workflowBusiness: WorkflowBusiness;
  private bpmnWorkflowBusiness: BpmnWorkflowBusiness;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!TaskController.singleton) {
      super(config);
      this.taskBusiness = new TaskBusiness();
      this.workflowBusiness = new WorkflowBusiness();
      this.bpmnWorkflowBusiness = new BpmnWorkflowBusiness();
      TaskController.singleton = this;
    }
    return TaskController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let savedTaskGroupEntities = [];
    let newLastWorkflowHistoryId;
    try {
      if (global.config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      const lastWorkflowHistoryIdHeader = req.headers['last-workflow-history-id'];

      for (const item of req.body) {
        const workflowTemplateId = item.workflowTemplateId;

        const taskGroupEntity = new TaskGroupEntity({
          taskTemplateEntity: new TaskTemplateEntity(item.taskTemplate),
          documentTemplateEntity: new DocumentTemplateEntity(item.documentTemplate),
        });

        const lastWorkflowHistory = await this.workflowBusiness.findLastWorkflowHistoryByWorkflowTemplateId(workflowTemplateId);

        if (lastWorkflowHistory && lastWorkflowHistory.id !== lastWorkflowHistoryIdHeader) {
          const error = new Error('Header Last-Workflow-History-Id expired.');
          (error as any).details = [{ lastWorkflowHistory: lastWorkflowHistory }];
          throw error;
        }

        const user = {
          ...this.getRequestUserBaseInfo(req),
          remoteAddress: req.connection.remoteAddress,
          xForwardedFor: req.headers['x-forwarded-for'] || null,
          userAgent: req.headers['user-agent'] || null,
        };

        const savedTaskGroupEntity = await this.taskBusiness.createOrUpdate(taskGroupEntity);
        savedTaskGroupEntities.push(savedTaskGroupEntity);
        global.log.save('user-created-updated-task-group', { user, data: { savedTaskGroupEntity } });

        // Auto save workflow process.
        const workflowHistory = await this.bpmnWorkflowBusiness.autoSaveVersion(workflowTemplateId, { user });

        const workflowWasCreated = workflowHistory && workflowHistory.id;
        newLastWorkflowHistoryId = workflowWasCreated ? workflowHistory.id : lastWorkflowHistoryIdHeader;
      }
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    if (newLastWorkflowHistoryId) {
      res.setHeader('Last-Workflow-History-Id', newLastWorkflowHistoryId);
    }
    this.responseData(res, savedTaskGroupEntities);
  }

  /**
   * Delete by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;

    try {
      if (global.config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      await this.taskBusiness.deleteById(id);

      const user = this.getRequestUserBaseInfo(req);
      await global.log.save('user-deleted-task-group', { user, data: { id } });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let task;

    try {
      task = await this.taskBusiness.findById(id);
      if (!task) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, task);
  }
}
