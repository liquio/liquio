const TaskEntity = require('../../entities/task');
const DocumentEntity = require('../../entities/document');

class TaskModel {
  constructor() {
    if (!TaskModel.singleton) {
      TaskModel.singleton = this;
    }

    return TaskModel.singleton;
  }

  async getAllByUserId(userId) {
    if (userId !== '5b75893b181a377d0cfa5cc3') {
      return {
        pagination: {
          total: 0,
          perPage: 15,
          currentPage: 1,
          lastPage: 1
        },
        data: []
      };
    }
    const tasks = {
      pagination: {
        total: 2,
        perPage: 15,
        currentPage: 1,
        lastPage: 1
      },
      data: [
        new TaskEntity({
          id: 'f3c99b20-2a35-11e9-9de3-bbc98d03527a',
          workflowId: 'f3c70310-2a35-11e9-9de3-bbc98d03527a',
          name: null,
          description: null,
          taskTemplateId: 1,
          documentId: 'f3cc3330-2a35-11e9-9de3-bbc98d03527a',
          signerUsers: [],
          performerUsers: ['5b75893b181a377d0cfa5cc3'],
          performerUnits: [],
          tags: [],
          data: {},
          createdBy: '5b75893b181a377d0cfa5cc3',
          updatedBy: '5b75893b181a377d0cfa5cc3',
          cancellationTypeId: null,
          dueDate: null
        }),
        new TaskEntity({
          id: 'dbb56aa0-2ec7-11e9-becf-9b1b108685ec',
          workflowId: 'dbb28470-2ec7-11e9-becf-9b1b108685ec',
          name: null,
          description: null,
          taskTemplateId: 1,
          documentId: 'dbb76670-2ec7-11e9-becf-9b1b108685ec',
          signerUsers: [],
          performerUsers: ['5b75893b181a377d0cfa5cc3'],
          performerUnits: [],
          tags: [],
          data: {},
          createdBy: '5b75893b181a377d0cfa5cc3',
          updatedBy: '5b75893b181a377d0cfa5cc3',
          cancellationTypeId: null,
          dueDate: null
        })
      ]
    };

    return tasks;
  }

  async findById(id) {
    if (id !== 'f3c99b20-2a35-11e9-9de3-bbc98d03527a') {
      return;
    }
    return new TaskEntity({
      id: '1',
      workflowId: 'f3c70310-2a35-11e9-9de3-bbc98d03527a',
      name: null,
      description: null,
      taskTemplateId: 1,
      documentId: 'f3cc3330-2a35-11e9-9de3-bbc98d03527a',
      document: new DocumentEntity({
        id: 'f3cc3330-2a35-11e9-9de3-bbc98d03527a',
        parentId: null,
        documentTemplateId: 4,
        documentStateId: 1,
        cancellationTypeId: null,
        number: null,
        isFinal: false,
        ownerId: '5b75893b181a377d0cfa5cc3',
        createdBy: '5b75893b181a377d0cfa5cc3',
        updatedBy: '5b75893b181a377d0cfa5cc3',
        data: {},
        description: null,
        fileName: null,
        fileType: null
      }),
      signerUsers: [],
      performerUsers: ['5b75893b181a377d0cfa5cc3'],
      performerUnits: [],
      tags: [],
      data: {},
      createdBy: '5b75893b181a377d0cfa5cc3',
      updatedBy: '5b75893b181a377d0cfa5cc3',
      cancellationTypeId: null,
      dueDate: null
    });
  }

  async findByDocumentId(documentId) {
    if (documentId !== 'f3cc3330-2a35-11e9-9de3-bbc98d03527a') {
      return;
    }

    return new TaskEntity({
      id: '1',
      workflowId: 'f3c70310-2a35-11e9-9de3-bbc98d03527a',
      name: null,
      description: null,
      taskTemplateId: 1,
      documentId: 'f3cc3330-2a35-11e9-9de3-bbc98d03527a',
      signerUsers: [],
      performerUsers: ['5b75893b181a377d0cfa5cc3'],
      performerUnits: [],
      tags: [],
      data: {},
      createdBy: '5b75893b181a377d0cfa5cc3',
      updatedBy: '5b75893b181a377d0cfa5cc3',
      cancellationTypeId: null,
      dueDate: null
    });
  }

  async setStatusFinished() {}
}

module.exports = TaskModel;
