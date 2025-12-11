const Provider = require('./provider');
const Sign = require('../../../../../lib/sign');
const Filestorage = require('../../../../../lib/filestorage');

class SignerProvider extends Provider {
  constructor(config) {
    super(config);
    this.signer = new Sign();
    this.filestorage = new Filestorage();
  }

  async send(data) {
    const { method } = data;
    log.save(`signer|${method}|send`, { data });

    switch (method) {
      case 'sign-file':
        return this.signFile(data);
      default:
        return super.send(data);
    }
  }

  async signFile({ fileIds }) {
    const result = [];

    for (const fileId of fileIds) {
      const file = await this.filestorage.getFile(fileId);

      if (!file) {
        throw new Error(`File with id ${fileId} not found.`);
      }

      const { data: p7s } = await this.signer.sign(file.fileContent, false);

      if (!p7s) {
        throw new Error('Error signing file.');
      }

      await this.filestorage.addP7sSignature(fileId, p7s);

      result.push({ fileId, fileName: file.name });

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return result;
  }
}

module.exports = SignerProvider;
