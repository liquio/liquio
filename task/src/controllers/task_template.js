
const Controller = require('./controller');
const TaskTemplateModel = require('../models/task_template');
const { ERROR_TASK_TEMPLATE_NOT_FOUND } = require('../constants/error');
const { NotFoundError } = require('../lib/errors');

/**
 * Task template controller.
 */
class TaskTemplateController extends Controller {
  /**
   * Task template controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!TaskTemplateController.singleton) {
      super(config);
      this.taskTemplateModel = new TaskTemplateModel();
      TaskTemplateController.singleton = this;
    }
    return TaskTemplateController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Get task templates.
    let taskTemplates;
    try {
      taskTemplates = await this.taskTemplateModel.getAll();
      taskTemplates = this.filterResponse(taskTemplates, true);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, taskTemplates);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const taskTemplateId = parseInt(req.params.id);

    // Prepare response data.
    let taskTemplate;
    try {
      taskTemplate = await this.taskTemplateModel.findById(taskTemplateId);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!taskTemplate) {
      return this.responseError(res, new NotFoundError(ERROR_TASK_TEMPLATE_NOT_FOUND));
    }

    this.responseData(res, this.filterResponse(taskTemplate));
  }
}

module.exports = TaskTemplateController;
