const WorkflowErrorEntity = require('../../entities/workflow_error');

class WorkflowErrorModel {
  constructor() {
    if (!WorkflowErrorModel.singleton) {
      WorkflowErrorModel.singleton = this;
    }

    return WorkflowErrorModel.singleton;
  }

  async getAll() {
    return [
      new WorkflowErrorEntity({
        id: 1,
        serviceName: 'manager',
        data: {
          error: 'test',
          queueMessage: {
            task_id: '0ca5cb80-3a69-11e9-b89c-6f96f41d79c5',
          },
        },
        createdAt: '2019-02-27T08:24:15.398Z',
        updatedAt: '2019-02-27T08:24:15.398Z',
      }),
      new WorkflowErrorEntity({
        id: 2,
        serviceName: 'manager',
        data: {
          error: '',
          queueMessage: {
            task_id: '3da08d60-3a69-11e9-b89c-6f96f41d79c5',
          },
        },
        createdAt: '2019-02-27T08:25:37.016Z',
        updatedAt: '2019-02-27T08:25:37.016Z',
      }),
    ];
  }

  async findById(id) {
    if (id !== 1) {
      return;
    }
    return new WorkflowErrorEntity({
      id: 1,
      serviceName: 'manager',
      data: {
        error: 'test',
        queueMessage: {
          task_id: '0ca5cb80-3a69-11e9-b89c-6f96f41d79c5',
        },
      },
      createdAt: '2019-02-27T08:24:15.398Z',
      updatedAt: '2019-02-27T08:24:15.398Z',
    });
  }

  async deleteById(id) {
    if (id !== 1) {
      return 0;
    }

    return 1;
  }
}

module.exports = WorkflowErrorModel;
