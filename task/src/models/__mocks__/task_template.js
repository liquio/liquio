const TaskTemplateEntity = require('../../entities/task_template');

class TaskTemplateModel {
  constructor() {
    if (!TaskTemplateModel.singleton) {
      TaskTemplateModel.singleton = this;
    }

    return TaskTemplateModel.singleton;
  }

  async getAll() {
    const taslTemplates = [
      new TaskTemplateEntity({
        id: 1,
        name: 'Test 1'
      }),
      new TaskTemplateEntity({
        id: 2,
        name: 'Test 2'
      }),
      new TaskTemplateEntity({
        id: 3,
        name: 'Test 3'
      })
    ];

    return taslTemplates;
  }

  async findById(id) {
    if (id !== 1) {
      return;
    }
    return new TaskTemplateEntity({
      id: 1,
      name: 'Test 1',
      documentTemplateId: 1,
      json_schema: {},
      html_template: ''
    });
  }
}

module.exports = TaskTemplateModel;
