// Import.
import qrImage from 'qr-image';

// Constants.
const QR_TYPES = {
  matrix: 'matrix',
  svg: 'svg',
  png: 'png',
  eps: 'eps',
  pdf: 'pdf',
};
const IMAGE_TYPES = {
  svg: 'svg',
  png: 'png',
  eps: 'eps',
  pdf: 'pdf',
};

/**
 * QR.
 */
class Qr {
  /**
   * QR constructor.
   */
  constructor() {
    // Define singleton.
    if (!Qr.singleton) {
      Qr.singleton = this;
    }
    return Qr.singleton;
  }

  /**
   * QR types.
   */
  static get QrTypes() {
    return QR_TYPES;
  }

  /**
   * Image types.
   */
  static get ImageTypes() {
    return IMAGE_TYPES;
  }

  /**
   * Get by type.
   * @param {string} text Text to transform into QR.
   * @param {string} qrType QR type
   */
  async getByType(text, qrType) {
    // Check.
    if (typeof qrType === 'undefined') {
      return;
    }

    // Define needed handler and handle.
    switch (qrType) {
      case Qr.QrTypes.matrix:
        return this.getMatrix(text);
      case Qr.QrTypes.png:
      case Qr.QrTypes.svg:
      case Qr.QrTypes.eps:
      case Qr.QrTypes.pdf:
        return this.getImage(text, qrType);
      default:
        return this.getImage(text, Qr.QrTypes.svg);
    }
  }

  /**
   * Get image.
   * @param {string} text Text to transform into QR.
   * @param {string} type Image type.
   */
  async getImage(text, imageType = Qr.ImageTypes.png) {
    const image = qrImage.imageSync(text, { type: imageType });
    return image;
  }

  /**
   * Get matrix.
   * @param {string} text Text to transform into QR.
   */
  async getMatrix(text) {
    const matrix = qrImage.matrix(text);
    return matrix;
  }
}

// Export.
export default Qr;
