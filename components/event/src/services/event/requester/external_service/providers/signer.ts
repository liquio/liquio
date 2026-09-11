import { Provider } from './provider';
import { Sign } from '../../../../../lib/sign';
import { FileStorage as Filestorage } from '../../../../../lib/filestorage';

export class SignerProvider extends Provider {
  signer: Sign;
  filestorage: Filestorage;

  constructor(_config?: any) {
    super();
    this.signer = new Sign();
    this.filestorage = new Filestorage();
  }

  async send(data: any): Promise<any> {
    const { method } = data;
    global.log.save(`signer|${method}|send`, { data });

    switch (method) {
      case 'sign-file':
        return this.signFile(data);
      default:
        return super.send(data);
    }
  }

  async signFile({ fileIds }: any): Promise<any> {
    const result = [];

    for (const fileId of fileIds) {
      const file = await this.filestorage.getFile(fileId);

      if (!file) {
        throw new Error(`File with id ${fileId} not found.`);
      }

      const { data: p7s } = (await this.signer.sign(file.fileContent, false)) as any;

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
