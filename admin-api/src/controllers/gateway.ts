const { matchedData } = require('express-validator');

const Exceptions = require('../exceptions');
const Controller = require('./controller');
const GatewayBusiness = require('../businesses/gateway');
const WorkflowBusiness = require('../businesses/workflow');
const BpmnWorkflowBusiness = require('../businesses/bpmn_workflow');
const GatewayTemplateEntity = require('../entities/gateway_template');

/**
 * Gateway controller.
 */
class GatewayController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!GatewayController.singleton) {
      super(config);
      this.gatewayBusiness = new GatewayBusiness();
      this.workflowBusiness = new WorkflowBusiness();
      this.bpmnWorkflowBusiness = new BpmnWorkflowBusiness();
      GatewayController.singleton = this;
    }
    return GatewayController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let savedGatewayTemplateEntities = [];
    let newLastWorkflowHistoryId;
    try {
      if (config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      const lastWorkflowHistoryIdHeader = req.headers['last-workflow-history-id'];

      for (const item of req.body) {
        const workflowTemplateId = item.workflowTemplateId;
        const gatewayEntity = new GatewayTemplateEntity(item);

        const lastWorkflowHistory = await this.workflowBusiness.findLastWorkflowHistoryByWorkflowTemplateId(workflowTemplateId);

        if (lastWorkflowHistory && lastWorkflowHistory.id !== lastWorkflowHistoryIdHeader) {
          const error = new Error('Header Last-Workflow-History-Id expired.');
          error.details = [{ lastWorkflowHistory: lastWorkflowHistory }];
          throw error;
        }

        const user = {
          ...this.getRequestUserBaseInfo(req),
          remoteAddress: req.connection.remoteAddress,
          xForwardedFor: req.headers['x-forwarded-for'] || null,
          userAgent: req.headers['user-agent'] || null,
        };

        const savedGatewayTemplateEntity = await this.gatewayBusiness.createOrUpdate(gatewayEntity);
        savedGatewayTemplateEntities.push(savedGatewayTemplateEntity);

        await log.save('user-created-updated-gateway-template', {
          user,
          data: { savedGatewayTemplateEntity },
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
    this.responseData(res, savedGatewayTemplateEntities);
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
      if (config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      await this.gatewayBusiness.deleteById(id);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-deleted-gateway-template', { user, data: { id } });
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
    let gateway;

    try {
      gateway = await this.gatewayBusiness.findById(id);
      if (!gateway) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, gateway);
  }
}

module.exports = GatewayController;
