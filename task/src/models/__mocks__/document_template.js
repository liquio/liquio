const DocumentTemplateEntity = require('../../entities/document_template');

class DocumentTemplateModel {
  constructor() {
    if (!DocumentTemplateModel.singleton) {
      DocumentTemplateModel.singleton = this;
    }

    return DocumentTemplateModel.singleton;
  }

  async getAll() {
    const documentTemplates = [
      new DocumentTemplateEntity({
        id: 1,
        name: 'Test 1'
      }),
      new DocumentTemplateEntity({
        id: 2,
        name: 'Test 2'
      }),
      new DocumentTemplateEntity({
        id: 3,
        name: 'Test 3'
      })
    ];

    return documentTemplates;
  }

  async findById(id) {
    if (id !== 1) {
      return;
    }
    return new DocumentTemplateEntity({
      id: 1,
      name: 'Test 1',
      json_schema: {},
      html_template: ''
    });
  }
}

module.exports = DocumentTemplateModel;
