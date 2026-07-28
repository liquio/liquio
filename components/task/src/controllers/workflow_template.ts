
import { Controller } from './controller';
import { ERROR_WORKFLOW_TEMPLATE_NOT_FOUND } from '../constants/error';
import { NotFoundError } from '../lib/errors';

/**
 * Workflow template controller.
 */
export class WorkflowTemplateController extends Controller {
  private static singleton: WorkflowTemplateController;

  /**
   * Workflow template controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowTemplateController.singleton) {
      super(config);
      WorkflowTemplateController.singleton = this;
    }
    return WorkflowTemplateController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Get workflow templates.
    const user = this.getRequestUserInfo(req);
    const unitIds = this.getRequestUserUnitIds(req);
    const userUnitsEntities = this.getRequestUserUnitEntities(req);

    let workflowTemplates;

    try {
      const workflowTemplateIds = [];
      if (
        global.config.onboarding?.onboardingTemplate?.workflowTemplateId &&
        global.config.onboarding?.onboardingTemplate?.taskTemplateId
      ) {
        workflowTemplateIds.push(global.config.onboarding.onboardingTemplate.workflowTemplateId);
      }

      workflowTemplates = await global.businesses.workflowTemplate.getAll(user, unitIds.all, userUnitsEntities);
      workflowTemplates = workflowTemplates.filter(v => !workflowTemplateIds.includes(v.id));

      workflowTemplates = this.filterResponse(workflowTemplates, true);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, workflowTemplates);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const workflowTemplateId = parseInt(req.params.id);
    const user = this.getRequestUserInfo(req);
    const unitIds = this.getRequestUserUnitIds(req);
    const userUnitsEntities = this.getRequestUserUnitEntities(req);

    // Prepare response data.
    let workflowTemplate;
    try {
      workflowTemplate = await global.businesses.workflowTemplate.findById(
        workflowTemplateId,
        user,
        unitIds.all,
        userUnitsEntities
      );
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!workflowTemplate) {
      return this.responseError(res, new NotFoundError(ERROR_WORKFLOW_TEMPLATE_NOT_FOUND));
    }

    this.responseData(res, this.filterResponse(workflowTemplate));
  }
}

