import Encryption from './encryption';
import crypto from 'crypto';

describe('Encryption - GCM Authentication Tag Validation', () => {
  const testKey = Buffer.alloc(32).toString('hex'); // 32-byte key for AES-256
  let encryption: Encryption;

  beforeEach(() => {
    // Reset singleton to allow multiple instances in tests
    (Encryption as any).singleton = undefined;
    encryption = new Encryption({ key: testKey });
  });

  describe('basic functionality', () => {
    it('should encrypt and decrypt data', () => {
      const key = 'bladDk3HluhCyeObdsMeMWWPXYIyHnTe';

      // Reset singleton
      (Encryption as any).singleton = undefined;
      const enc = new Encryption({ key });

      const data = 'Hello, World!';

      const encryptedData = enc.encrypt(data);

      const decryptedData = enc.decrypt(encryptedData);

      expect(decryptedData).toBe(data);
    });
  });

  describe('encrypt', () => {
    it('should encrypt data and generate 16-byte authentication tag', () => {
      const data = 'sensitive data';
      const encrypted = encryption.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      // Split and validate structure
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);

      const [iv, authTag, encryptedData] = parts;
      expect(iv).toBeDefined();
      expect(authTag).toBeDefined();
      expect(encryptedData).toBeDefined();

      // Auth tag should be base64-encoded 16 bytes (24 characters in base64)
      const authTagBuffer = Buffer.from(authTag, 'base64');
      expect(authTagBuffer.length).toBe(16);
    });

    it('should produce different outputs for same input (due to random IV)', () => {
      const data = 'test data';
      const encrypted1 = encryption.encrypt(data);
      const encrypted2 = encryption.encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt valid encrypted data', () => {
      const originalData = 'test message';
      const encrypted = encryption.encrypt(originalData);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should reject decryption with invalid authentication tag length (too short)', () => {
      const data = 'test data';
      const encrypted = encryption.encrypt(data);
      const parts = encrypted.split(':');

      // Create invalid tag (too short - 8 bytes instead of 16)
      const invalidTag = Buffer.alloc(8).toString('base64');
      const malformedEncrypted = `${parts[0]}:${invalidTag}:${parts[2]}`;

      expect(() => {
        encryption.decrypt(malformedEncrypted);
      }).toThrow('Invalid authentication tag length. Expected 16 bytes.');
    });

    it('should reject decryption with invalid authentication tag length (too long)', () => {
      const data = 'test data';
      const encrypted = encryption.encrypt(data);
      const parts = encrypted.split(':');

      // Create invalid tag (too long - 24 bytes instead of 16)
      const invalidTag = Buffer.alloc(24).toString('base64');
      const malformedEncrypted = `${parts[0]}:${invalidTag}:${parts[2]}`;

      expect(() => {
        encryption.decrypt(malformedEncrypted);
      }).toThrow('Invalid authentication tag length. Expected 16 bytes.');
    });

    it('should reject decryption with null authentication tag', () => {
      const data = 'test data';
      const encrypted = encryption.encrypt(data);
      const parts = encrypted.split(':');

      // Create invalid structure with missing tag
      const malformedEncrypted = `${parts[0]}::${parts[2]}`;

      expect(() => {
        encryption.decrypt(malformedEncrypted);
      }).toThrow('Invalid authentication tag length. Expected 16 bytes.');
    });

    it('should reject decryption when ciphertext is tampered (authentication fails)', () => {
      const originalData = 'protected data';
      const encrypted = encryption.encrypt(originalData);
      const parts = encrypted.split(':');

      // Tamper with encrypted data but keep valid tag structure
      const tamperedData = Buffer.from(parts[2], 'base64');
      if (tamperedData.length > 0) {
        tamperedData[0] ^= 0xff; // Flip bits in first byte
      }
      const malformedEncrypted = `${parts[0]}:${parts[1]}:${tamperedData.toString('base64')}`;

      // This should fail during decryption due to authentication failure
      expect(() => {
        encryption.decrypt(malformedEncrypted);
      }).toThrow();
    });

    it('should only accept exactly 16-byte authentication tags', () => {
      const data = 'test';
      const encrypted = encryption.encrypt(data);
      const parts = encrypted.split(':');

      // Test with 15 bytes
      const tag15 = Buffer.alloc(15).toString('base64');
      const invalid15 = `${parts[0]}:${tag15}:${parts[2]}`;
      expect(() => encryption.decrypt(invalid15)).toThrow('Invalid authentication tag length. Expected 16 bytes.');

      // Test with 17 bytes
      const tag17 = Buffer.alloc(17).toString('base64');
      const invalid17 = `${parts[0]}:${tag17}:${parts[2]}`;
      expect(() => encryption.decrypt(invalid17)).toThrow('Invalid authentication tag length. Expected 16 bytes.');

      // Test with 16 bytes should pass length check
      const tag16 = Buffer.alloc(16).toString('base64');
      const valid16 = `${parts[0]}:${tag16}:${parts[2]}`;
      expect(() => encryption.decrypt(valid16)).not.toThrow('Invalid authentication tag length. Expected 16 bytes.');
    });
  });

  describe('packEncrypted/unpackEncrypted', () => {
    it('should preserve 16-byte authentication tag through pack/unpack cycle', () => {
      const encryptedData = 'YWJjZGVmZ2hpamtsbW4=';
      const iv = crypto.randomBytes(12);
      const authTag = Buffer.alloc(16).toString('base64');

      const packed = encryption.packEncrypted(encryptedData, iv, authTag);
      const unpacked = (encryption as any).unpackEncrypted(packed);

      expect(unpacked.authTag.length).toBe(16);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on subsequent instantiation', () => {
      (Encryption as any).singleton = undefined;
      const enc1 = new Encryption({ key: testKey });
      const enc2 = new Encryption({ key: testKey });

      expect(enc1).toBe(enc2);
    });
  });

  describe('error handling', () => {
    it('should throw meaningful error for corrupted packed data', () => {
      expect(() => {
        encryption.decrypt('invalid:data');
      }).toThrow();
    });
  });

  describe('GCM security properties', () => {
    it('should detect when authentication tag is omitted', () => {
      const data = 'sensitive';
      const encrypted = encryption.encrypt(data);
      const parts = encrypted.split(':');

      // Remove auth tag
      const noTag = `${parts[0]}::${parts[2]}`;

      expect(() => {
        encryption.decrypt(noTag);
      }).toThrow('Invalid authentication tag length');
    });

    it('should validate tag before attempting decryption', () => {
      const data = 'test';
      const encrypted = encryption.encrypt(data);
      const parts = encrypted.split(':');

      // Create tag with wrong length
      const wrongLengthTag = Buffer.alloc(20).toString('base64');
      const invalid = `${parts[0]}:${wrongLengthTag}:${parts[2]}`;

      // Should fail immediately on tag validation, not on decryption
      expect(() => {
        encryption.decrypt(invalid);
      }).toThrow('Invalid authentication tag length. Expected 16 bytes.');
    });
  });
});
