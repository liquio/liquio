const Decorator = require('./decorator');

class DecoratorSigner extends Decorator {
  async transform(data) {
    const { method } = data;

    switch (method) {
      case 'sign-file':
        return this.signFileDataTransform(data);
      default:
        return super.transform(data);
    }
  }

  async signFileDataTransform(data) {
    const { fileId: fileIdProperty, documents, events, method } = data;

    if (!fileIdProperty) {
      throw new Error('File id is not defined.');
    }

    const fileIdFunction = this.sandbox.evalWithArgs(
      fileIdProperty,
      [],
      { meta: { fn: 'fileId', caller: 'DecoratorSigner.signFileDataTransform' } },
    );

    if (!fileIdFunction || typeof fileIdFunction !== 'function') {
      throw new Error('Function fileId is not defined.');
    }

    if (typeof fileIdFunction !== 'function') {
      throw new Error('Function fileId is not defined.');
    }

    const fileId = fileIdFunction({ documents, events });

    if (!fileId) {
      throw new Error('File id function returned empty value.');
    }

    return { method, fileIds: [].concat(fileId).filter(Boolean) };
  }
}

module.exports = DecoratorSigner;
