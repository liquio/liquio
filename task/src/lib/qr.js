
const qrImage = require('qr-image');

// Constants.
const IMAGE_TYPES = {
  svg: 'svg',
  png: 'png',
  eps: 'eps',
  pdf: 'pdf'
};

/**
 * QR image generator.
 */
class QrGenerator {
  /**
   * QR generator constructor.
   */
  constructor() {
    // Define singleton.
    if (!QrGenerator.singleton) { 
      QrGenerator.singleton = this;
    }
    return QrGenerator.singleton;
  }

  /**
   * Get image.
   * @param {string} text Text to transform into QR.
   * @param {string} type Image type.
   */
  async getImage(text, imageType = IMAGE_TYPES.svg) {
    const image = qrImage.imageSync(text, { type: imageType });
    return image;
  }
}

module.exports = QrGenerator;
