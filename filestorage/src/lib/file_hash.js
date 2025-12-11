const crypto = require('crypto');

const HASH_ALGORITHM_MD5 = 'md5';
const HASH_ALGORITHM_SHA1 = 'sha1';
const HASH_ALGORITHM_SHA256 = 'sha256';
const HASH_DIGEST_HEX = 'hex';

/**
 * File hash.
 */
class FileHash {
  /**
   * Hash constructor.
   * @param {Buffer} data Data.
   */
  constructor(data) {
    this.data = data;
  }

  /**
   * Calc hash.
   * @returns {{md5: string, sha1: string}} Hash info.
   */
  calc() {
    // Calc hash.
    this.md5 = crypto.createHash(HASH_ALGORITHM_MD5).update(this.data).digest(HASH_DIGEST_HEX);
    this.sha1 = crypto.createHash(HASH_ALGORITHM_SHA1).update(this.data).digest(HASH_DIGEST_HEX);
    this.sha256 = crypto.createHash(HASH_ALGORITHM_SHA256).update(this.data).digest(HASH_DIGEST_HEX);

    // Return hash.
    return { md5: this.md5, sha1: this.sha1, sha256: this.sha256 };
  }
}

// Export.
module.exports = FileHash;
