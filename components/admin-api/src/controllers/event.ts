import { matchedData } from 'express-validator';

import { Exceptions } from '../exceptions';
import { Controller } from './controller';
import { EventBusiness } from '../businesses/event';
import { WorkflowBusiness } from '../businesses/workflow';
import { BpmnWorkflowBusiness } from '../businesses/bpmn_workflow';
import { EventTemplateEntity } from '../entities/event_template';

/**
 * Event controller.
 */
export class EventController extends Controller {
  private static singleton: EventController;

  private eventBusiness: EventBusiness;
  private workflowBusiness: WorkflowBusiness;
  private bpmnWorkflowBusiness: BpmnWorkflowBusiness;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!EventController.singleton) {
      super(config);
      this.eventBusiness = new EventBusiness();
      this.workflowBusiness = new WorkflowBusiness();
      this.bpmnWorkflowBusiness = new BpmnWorkflowBusiness();
      EventController.singleton = this;
    }
    return EventController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let savedEventTemplateEntities = [];
    let newLastWorkflowHistoryId;
    try {
      if (global.config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      const lastWorkflowHistoryIdHeader = req.headers['last-workflow-history-id'];

      for (const item of req.body) {
        const workflowTemplateId = item.workflowTemplateId;
        const eventEntity = new EventTemplateEntity(item);

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

        const savedEventTemplateEntity = await this.eventBusiness.createOrUpdate(eventEntity);
        savedEventTemplateEntities.push(savedEventTemplateEntity);

        await global.log.save('user-created-updated-event-template', {
          user,
          data: { savedEventTemplateEntity },
        });

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
    this.responseData(res, savedEventTemplateEntities);
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

      await this.eventBusiness.deleteById(id);

      const user = this.getRequestUserBaseInfo(req);
      await global.log.save('user-deleted-event-template', { user, data: { id } });
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
    let event;

    try {
      event = await this.eventBusiness.findById(id);
      if (!event) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, event);
  }

  /**
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async skipDelay(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let event;

    const currentEvent = await global.models.event.findById(id);
    if (currentEvent.dueDate < new Date()) {
      return this.responseError(res, 'Event already skipped.');
    }

    try {
      event = await this.eventBusiness.updateById(id, { dueDate: new Date(), data: { dueDate: new Date() } });
      if (!event) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, event);
  }
}
