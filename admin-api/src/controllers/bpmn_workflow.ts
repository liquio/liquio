const { matchedData } = require('express-validator');

const Controller = require('./controller');
const Stream = require('../lib/stream');
const BpmnWorkflowBusiness = require('../businesses/bpmn_workflow');
const WorkflowBusiness = require('../businesses/workflow');

/**
 * BPMN workflow controller.
 */
class BpmnWorkflowController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!BpmnWorkflowController.singleton) {
      super(config);
      this.bpmnWorkflowBusiness = new BpmnWorkflowBusiness();
      this.workflowBusiness = new WorkflowBusiness();
      BpmnWorkflowController.singleton = this;
    }
    return BpmnWorkflowController.singleton;
  }

  /**
   * Export.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async export(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let bpmnWorkflow;

    try {
      bpmnWorkflow = await this.bpmnWorkflowBusiness.export(id);
      if (!bpmnWorkflow) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseFile(res, bpmnWorkflow, 'application/bpmn', 'workflow.bpmn');
  }

  /**
   * Import.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async import(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const { type = 'minor', name = 'Front does not exist.', description = 'Front does not exist.' } = matchedData(req, { locations: ['body'] });
    const force = queryData.force || false;
    try {
      let fileContentBuffer;
      let chunks = [];
      req.on('data', (data) => chunks.push(data));
      req.on('end', () => {
        fileContentBuffer = Buffer.concat(chunks);
      });
      await Stream.waitEndEvent(req);

      let data = fileContentBuffer.toString();

      const user = {
        ...this.getRequestUserBaseInfo(req),
        remoteAddress: req.connection.remoteAddress,
        xForwardedFor: req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      };
      await this.bpmnWorkflowBusiness.import(data, force, { type, name, description, user });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Get versions.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getVersions(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;

    let versions;
    try {
      versions = await this.bpmnWorkflowBusiness.getVersionsByWorkflowTemplateId(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, versions);
  }

  /**
   * Find by version.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findByVersion(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const { id, version } = paramsData;

    let versions;
    try {
      versions = await this.bpmnWorkflowBusiness.findVersionByWorkflowTemplateIdAndVersion(id, version);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, versions);
  }

  /**
   * Save version.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async saveVersion(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const { type, name, description } = matchedData(req, { locations: ['body'] });
    const id = paramsData.id;

    try {
      const lastWorkflowHistory = await this.workflowBusiness.findLastWorkflowHistoryByWorkflowTemplateId(id);

      const lastWorkflowHistoryIdHeader = req.headers['last-workflow-history-id'];

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
      const workflowHistory = await this.bpmnWorkflowBusiness.saveVersion(id, {
        type,
        name,
        description,
        user,
      });
      if (!workflowHistory) {
        return this.responseError(res, 'Not found.', 404);
      }
      if (workflowHistory && workflowHistory.id) {
        res.setHeader('Last-Workflow-History-Id', workflowHistory.id);
      }
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Copy preparation.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async copyPreparation(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    let result;
    try {
      result = await this.bpmnWorkflowBusiness.copyPreparation(id);
      if (!result) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result);
  }

  /**
   * Copy.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async copy(req, res) {
    const { id: workflowTemplateId } = matchedData(req, { locations: ['params'] });
    const { request_id: requestId, not_replacing_diff_ids: notReplacingDiffIds = [] } = matchedData(req, { locations: ['body'] });
    const user = {
      ...this.getRequestUserBaseInfo(req),
      remoteAddress: req.connection.remoteAddress,
      xForwardedFor: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
    };
    let result;
    try {
      result = await this.bpmnWorkflowBusiness.copy(workflowTemplateId, requestId, notReplacingDiffIds, user);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result);
  }
}

module.exports = BpmnWorkflowController;
