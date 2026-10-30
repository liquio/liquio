import { matchedData } from 'express-validator';

import { Controller } from './controller';
import { getBusinesses, getConfig, getLog } from '../lib/context';

/**
 * Workflow controller.
 */
export class WorkflowController extends Controller {
  private static singleton: WorkflowController;

  constructor() {
    // Define singleton.
    if (!WorkflowController.singleton) {
      super();
      WorkflowController.singleton = this;
    }
    return WorkflowController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};

    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    const { page, count } = queryData;

    let workflows;
    try {
      const onboardingWorkflowTemplateIds = [];
      if (getConfig().onboarding?.onboardingTemplate?.workflowTemplateId && getConfig().onboarding?.onboardingTemplate?.taskTemplateId) {
        onboardingWorkflowTemplateIds.push(getConfig().onboarding.onboardingTemplate.workflowTemplateId);
      }

      workflows = await getBusinesses().workflow.getAllByUserId(userId, {
        userUnitIds: userUnitIds,
        currentPage: page,
        perPage: count,
        sort: sort,
        filters: filters,
        onboardingWorkflowTemplateIds,
      });
      workflows.data = this.filterResponse(workflows.data, true);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, workflows, true);
  }

  /**
   * Find workflow by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const id = req.params.id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    let workflow;
    try {
      workflow = await getBusinesses().workflow.findById(id, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, this.filterResponse(workflow));
  }

  /**
   * Get workflows filtered from elastic.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAllElasticFiltered(req, res) {
    // Define params.
    const { page, count, sort, filters } = {
      page: 1,
      count: 20,
      sort: {},
      filters: {},
      ...matchedData(req, { locations: ['query'] }),
    };

    let workflows;

    try {
      /** @var {WorkflowBusiness} getBusinesses().workflow */
      workflows = await getBusinesses().workflow.getAllElasticFiltered({
        currentPage: page,
        perPage: count,
        sort: sort,
        filters: filters,
      });
    } catch (error) {
      getLog().save('workflow-get-all-filtered-error', { error: error && error.message }, 'error');
      return this.responseError(res, error);
    }

    this.responseData(res, workflows, true);
  }
}
