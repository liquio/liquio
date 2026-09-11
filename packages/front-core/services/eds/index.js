import Signer from 'services/eds/signer';

class EDSService {
  /**
   * Constructor of electron digital signature service
   */
  constructor() {
    this.signer = new Signer();
  }

  getSigner = () =>
    [this.signer]
      .filter((signer) => signer.inited)
      .shift();

  getFileKeySigner = () => this.signer;

  getServerList = () => this.signer.getServerList();
}

const service = new EDSService();

export default service;
