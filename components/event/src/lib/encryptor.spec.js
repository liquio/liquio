const Encryptor = require('./encryptor');
const crypto = require('crypto');

describe('Encryptor - GCM Authentication Tag Validation', () => {
  // 32-byte key (256 bits for AES-256) encoded in base64
  const testKey = Buffer.alloc(32, 'key').toString('base64');
  let encryptor;

  beforeEach(() => {
    encryptor = new Encryptor({ key: testKey });
  });

  describe('encrypt', () => {
    it('should encrypt data and generate 16-byte authentication tag', () => {
      const data = 'sensitive data';
      const encrypted = encryptor.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      // Split and validate structure
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);

      const [iv, authTag, encryptedData] = parts;
      expect(iv).toBeDefined();
      expect(authTag).toBeDefined();
      expect(encryptedData).toBeDefined();

      // Auth tag should be base64-encoded 16 bytes (which is 24 characters in base64)
      const authTagBuffer = Buffer.from(authTag, 'base64');
      expect(authTagBuffer.length).toBe(16);
    });

    it('should produce different outputs for same input (due to random IV)', () => {
      const data = 'test data';
      const encrypted1 = encryptor.encrypt(data);
      const encrypted2 = encryptor.encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt valid encrypted data', () => {
      const originalData = 'test message';
      const encrypted = encryptor.encrypt(originalData);
      const decrypted = encryptor.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should reject decryption with invalid authentication tag length', () => {
      const data = 'test data';
      const encrypted = encryptor.encrypt(data);
      const parts = encrypted.split(':');

      // Create invalid tag (too short - 8 bytes instead of 16)
      const invalidTag = Buffer.alloc(8).toString('base64');
      const malformedEncrypted = `${parts[0]}:${invalidTag}:${parts[2]}`;

      expect(() => {
        encryptor.decrypt(malformedEncrypted);
      }).toThrow('Invalid authentication tag length. Expected 16 bytes.');
    });

    it('should reject decryption with null authentication tag', () => {
      const data = 'test data';
      const encrypted = encryptor.encrypt(data);
      const parts = encrypted.split(':');

      // Create invalid structure with missing tag
      const malformedEncrypted = `${parts[0]}::${parts[2]}`;

      expect(() => {
        encryptor.decrypt(malformedEncrypted);
      }).toThrow('Invalid authentication tag length. Expected 16 bytes.');
    });

    it('should reject decryption when ciphertext is tampered (tag becomes invalid)', () => {
      const originalData = 'protected data';
      const encrypted = encryptor.encrypt(originalData);
      const parts = encrypted.split(':');

      // Tamper with encrypted data but keep valid tag structure
      const tamperedData = Buffer.from(parts[2], 'base64');
      if (tamperedData.length > 0) {
        tamperedData[0] ^= 0xff; // Flip bits in first byte
      }
      const malformedEncrypted = `${parts[0]}:${parts[1]}:${tamperedData.toString('base64')}`;

      // This should fail during decryption due to authentication failure
      expect(() => {
        encryptor.decrypt(malformedEncrypted);
      }).toThrow();
    });

    it('should only accept exactly 16-byte authentication tags', () => {
      const data = 'test';
      const encrypted = encryptor.encrypt(data);
      const parts = encrypted.split(':');

      // Test with 15 bytes
      const tag15 = Buffer.alloc(15).toString('base64');
      const invalid15 = `${parts[0]}:${tag15}:${parts[2]}`;
      expect(() => encryptor.decrypt(invalid15)).toThrow('Invalid authentication tag length. Expected 16 bytes.');

      // Test with 17 bytes
      const tag17 = Buffer.alloc(17).toString('base64');
      const invalid17 = `${parts[0]}:${tag17}:${parts[2]}`;
      expect(() => encryptor.decrypt(invalid17)).toThrow('Invalid authentication tag length. Expected 16 bytes.');

      // Test with 16 bytes should work
      const tag16 = Buffer.alloc(16).toString('base64');
      // Note: This won't decrypt correctly (invalid tag), but should pass length check
      const valid16 = `${parts[0]}:${tag16}:${parts[2]}`;
      expect(() => encryptor.decrypt(valid16)).not.toThrow('Invalid authentication tag length. Expected 16 bytes.');
    });
  });

  describe('pack/unpack', () => {
    it('should preserve 16-byte authentication tag through pack/unpack cycle', () => {
      const encryptedData = 'YWJjZGVmZ2hpamtsbW4=';
      const iv = crypto.randomBytes(12);
      const authTag = crypto.randomBytes(16);

      const packed = encryptor.pack(encryptedData, iv, authTag);
      const unpacked = encryptor.unpack(packed);

      expect(unpacked.authTag.length).toBe(16);
      expect(unpacked.authTag).toEqual(authTag);
    });
  });

  describe('error handling', () => {
    it('should throw error when key is not provided', () => {
      expect(() => {
        new Encryptor({});
      }).toThrow('Encryption key is required.');
    });

    it('should throw meaningful error for corrupted packed data', () => {
      expect(() => {
        encryptor.decrypt('invalid:data');
      }).toThrow();
    });
  });
});
