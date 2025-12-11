
const Business = require('./business');
const WorkflowTemplateModel = require('../models/workflow_template');
const Sandbox = require('../lib/sandbox');

const unitIdToTemplateCategoryIds = {
  1000770: [1000],  // еРезидент => Послуги для еРезидентів
};

/**
 * Workflow template business.
 * @typedef {import('../entities/workflow_template')} WorkflowTemplateEntity
 */
class WorkflowTemplateBusiness extends Business {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowTemplateBusiness.singleton) {
      super(config);
      WorkflowTemplateBusiness.singleton = this;
      this.workflowTemplateModel = new WorkflowTemplateModel();
      this.sandbox = new Sandbox();
    }
    return WorkflowTemplateBusiness.singleton;
  }

  /**
   * Get all.
   * @param {object} user User.
   * @param {number[]} unitIds User unit IDs.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units User units.
   * @returns {Promise<WorkflowTemplateEntity[]>} Workflow template entities.
   */
  async getAll(user, unitIds, units) {
    const templateCategoryIds = unitIds.reduce((acc, unitId) => [...acc, ...(unitIdToTemplateCategoryIds[unitId] || [])], []);

    const workflowTemplates = await this.workflowTemplateModel.getAll({ templateCategoryIds });

    for (const workflowTemplate of workflowTemplates) {
      workflowTemplate.entryTaskTemplateIds = this.prepareEntryTaskTemplateIds(
        workflowTemplate.data.entryTaskTemplateIds || [],
        user,
        unitIds,
        units
      );
    }

    return workflowTemplates;
  }

  /**
   * Find by ID.
   * @param {number} id Workflow template ID.
   * @param {object} user User.
   * @param {number[]} unitIds User unit IDs.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units User units.
   * @returns {Promise<WorkflowTemplateEntity>} Workflow template entity.
   */
  async findById(id, user, unitIds, units) {
    const workflowTemplate = await this.workflowTemplateModel.findById(id);

    if (!workflowTemplate) {
      return;
    }

    workflowTemplate.entryTaskTemplateIds = this.prepareEntryTaskTemplateIds(
      workflowTemplate.data.entryTaskTemplateIds || [],
      user,
      unitIds,
      units
    );

    return workflowTemplate;
  }

  /**
   * Prepare entry task template IDs.
   * @private
   * @param {array} entryTaskTemplateIds Entry task template ids.
   * @param {object} user User.
   * @param {number[]} unitIds User unit IDs.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units User units.
   * @returns {Promise<object[]>}
   */
  prepareEntryTaskTemplateIds(entryTaskTemplateIds, user, unitIds, units) {
    const preparedEntryTaskTemplateIds = [];

    if (Array.isArray(entryTaskTemplateIds)) {
      for (const taskTemplateId of entryTaskTemplateIds) {
        if (typeof taskTemplateId === 'object' && typeof taskTemplateId.id !== 'undefined') {
          try {
            const id = this.sandbox.evalWithArgs(
              taskTemplateId.id,
              [user, unitIds, units],
              { meta: { fn: 'entryTaskTemplateIds.id', taskTemplateId: taskTemplateId.id } },
            );
            if (id) {
              preparedEntryTaskTemplateIds.push({
                id,
                name: taskTemplateId.name || '',
                hidden: taskTemplateId.hidden || false
              });
            }
          } catch (error) {
            global.log.save('entry-task-template-id-error', error.message, 'warn');

            preparedEntryTaskTemplateIds.push({
              name: taskTemplateId.name || '',
              error: 'Invalid entry task template function.'
            });
          }
        } else {
          preparedEntryTaskTemplateIds.push({
            id: taskTemplateId,
            name: ''
          });
        }
      }
    }

    return preparedEntryTaskTemplateIds;
  }
}

module.exports = WorkflowTemplateBusiness;
