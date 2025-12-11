const WorkflowTemplateEntity = require('../../entities/workflow_template');

class WorkflowTemplateModel {
  constructor() {
    if (!WorkflowTemplateModel.singleton) {
      WorkflowTemplateModel.singleton = this;
    }

    return WorkflowTemplateModel.singleton;
  }

  async getAll() {
    const workflowTemplates = [
      new WorkflowTemplateEntity({
        id: 1,
        name: 'Test 1',
        description: ''
      }),
      new WorkflowTemplateEntity({
        id: 2,
        name: 'Test 2',
        description: ''
      }),
      new WorkflowTemplateEntity({
        id: 3,
        name: 'Test 3',
        description: ''
      })
    ];

    return workflowTemplates;
  }

  async findById(id) {
    if (id !== 1) {
      return;
    }
    return new WorkflowTemplateEntity({
      id: 1,
      name: 'Test 1',
      description: ''
    });
  }
}

module.exports = WorkflowTemplateModel;
