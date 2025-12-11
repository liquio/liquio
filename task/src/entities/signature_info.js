
const Entity = require('./entity');

/**
 * Document signature entity.
 */
class SignatureInfoEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document object.
   * @param {string} options.signer Signer.
   */
  constructor({ signer, issuer, serial, signTime, pem, signature }) {
    super();

    this.signer = signer;
    this.issuer = issuer;
    this.serial = serial;
    this.signTime = signTime;
    this.pem = pem;
    this.signature = signature;
  }
}

module.exports = SignatureInfoEntity;
