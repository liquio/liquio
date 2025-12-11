const DocumentEntity = require('../../entities/document');

class DocumentModel {
  constructor() {
    if (!DocumentModel.singleton) {
      DocumentModel.singleton = this;
    }

    return DocumentModel.singleton;
  }

  async findById(id) {
    if (id !== 'f3cc3330-2a35-11e9-9de3-bbc98d03527a') {
      return;
    }
    return new DocumentEntity({
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
    });
  }

  async updateData(id, userId, data) {
    if (id !== 'f3cc3330-2a35-11e9-9de3-bbc98d03527a') {
      return;
    }
    return new DocumentEntity({
      id: 'f3cc3330-2a35-11e9-9de3-bbc98d03527a',
      parentId: null,
      documentTemplateId: 4,
      documentStateId: 1,
      cancellationTypeId: null,
      number: null,
      isFinal: false,
      ownerId: '5b75893b181a377d0cfa5cc3',
      createdBy: '5b75893b181a377d0cfa5cc3',
      updatedBy: userId,
      data: data,
      description: null,
      fileName: null,
      fileType: null
    });
  }
}

module.exports = DocumentModel;
