import ImportBusiness from './import';
import RecordModel from '../models/record';
import RegisterModel from '../models/register';
import KeyModel from '../models/key';
import Log from '../lib/log';
import LogProvider from '../lib/log/providers/log_provider';

// Mock models
jest.mock('../models/record');
jest.mock('../models/register');
jest.mock('../models/key');

// Mock Log provider to avoid actual logging
class MockLogProvider extends LogProvider {
  constructor() {
    super('mock');
  }

  async save() {
    // Do nothing
  }
}

describe('ImportBusiness', () => {
  let importBusiness: ImportBusiness;
  let recordModelMock: jest.Mocked<typeof RecordModel>;
  let registerModelMock: jest.Mocked<typeof RegisterModel>;
  let keyModelMock: jest.Mocked<typeof KeyModel>;

  beforeEach(() => {
    // Initialize Log singleton if not already done
    if (!(Log as any).singleton) {
      new Log([new MockLogProvider()]);
    }

    // Clear singleton
    (ImportBusiness as any).singleton = undefined;

    // Reset all mocks
    jest.clearAllMocks();

    // Mock model instances
    recordModelMock = RecordModel as jest.Mocked<typeof RecordModel>;
    registerModelMock = RegisterModel as jest.Mocked<typeof RegisterModel>;
    keyModelMock = KeyModel as jest.Mocked<typeof KeyModel>;

    // Setup mock implementations
    recordModelMock.getInstance = jest.fn().mockReturnValue({
      getByKeyId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      bulkDelete: jest.fn()
    });

    registerModelMock.getInstance = jest.fn().mockReturnValue({
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    });

    keyModelMock.getInstance = jest.fn().mockReturnValue({
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    });

    // Create instance
    importBusiness = new ImportBusiness({});
  });

  describe('checkExistingRecordsByJsonSchema', () => {
    const keyId = 123;
    const simpleSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      },
      required: ['name']
    };

    it('should validate existing records against JSON schema', async () => {
      const validRecords = [
        { id: 1, data: { name: 'John', age: 30 } },
        { id: 2, data: { name: 'Jane', age: 25 } }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: validRecords
      });

      // Should not throw
      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, simpleSchema)).resolves.not.toThrow();
    });

    it('should throw error when record does not match schema', async () => {
      const invalidRecords = [
        { id: 1, data: { name: 'John', age: 30 } },
        { id: 2, data: { age: 25 } } // Missing required 'name' field
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, simpleSchema)).rejects.toThrow(/doesn't match JSON schema/);
    });

    it('should throw error with correct record ID in message', async () => {
      const invalidRecords = [
        { id: 999, data: { age: 25 } } // Missing required 'name' field
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      try {
        await importBusiness.checkExistingRecordsByJsonSchema(keyId, simpleSchema);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Record with ID "999"');
      }
    });

    it('should validate empty records array', async () => {
      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: []
      });

      // Should not throw
      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, simpleSchema)).resolves.not.toThrow();
    });

    it('should handle complex nested schema', async () => {
      const complexSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              zipCode: { type: 'number' }
            },
            required: ['city']
          }
        },
        required: ['name']
      };

      const validRecords = [
        {
          id: 1,
          data: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'New York',
              zipCode: 10001
            }
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: validRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, complexSchema)).resolves.not.toThrow();
    });

    it('should fail on invalid nested object', async () => {
      const complexSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: {
            type: 'object',
            properties: {
              city: { type: 'string' }
            },
            required: ['city']
          }
        },
        required: ['name']
      };

      const invalidRecords = [
        {
          id: 1,
          data: {
            name: 'John',
            address: {
              street: '123 Main St'
              // Missing required 'city'
            }
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, complexSchema)).rejects.toThrow(/doesn't match JSON schema/);
    });

    it('should validate type constraints', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string' },
          count: { type: 'number' },
          active: { type: 'boolean' }
        },
        required: ['email', 'count', 'active']
      };

      const validRecords = [
        {
          id: 1,
          data: {
            email: 'john@example.com',
            count: 42,
            active: true
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: validRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).resolves.not.toThrow();
    });

    it('should fail when property type does not match', async () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number' }
        },
        required: ['count']
      };

      const invalidRecords = [
        {
          id: 1,
          data: {
            count: 'not a number' // Should be number
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).rejects.toThrow(/doesn't match JSON schema/);
    });

    it('should handle arrays in schema', async () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['name']
      };

      const validRecords = [
        {
          id: 1,
          data: {
            name: 'John',
            tags: ['tag1', 'tag2', 'tag3']
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: validRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).resolves.not.toThrow();
    });

    it('should fail when array items have wrong type', async () => {
      const schema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      };

      const invalidRecords = [
        {
          id: 1,
          data: {
            tags: ['valid', 123, 'valid'] // 123 should be string
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).rejects.toThrow(/doesn't match JSON schema/);
    });

    it('should validate with additionalProperties false', async () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        additionalProperties: false
      };

      const validRecords = [
        {
          id: 1,
          data: {
            name: 'John'
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: validRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).resolves.not.toThrow();
    });

    it('should fail with additionalProperties false when extra properties present', async () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        additionalProperties: false
      };

      const invalidRecords = [
        {
          id: 1,
          data: {
            name: 'John',
            extra: 'field' // Not allowed
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).rejects.toThrow(/doesn't match JSON schema/);
    });

    it('should handle multiple validation errors in error message', async () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'email']
      };

      const invalidRecords = [
        {
          id: 1,
          data: {
            // Missing both required fields
            age: 'not a number'
          }
        }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      try {
        await importBusiness.checkExistingRecordsByJsonSchema(keyId, schema);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Validation errors');
        expect(error.message).toContain('[');
        expect(error.message).toContain(']');
      }
    });

    it('should validate multiple records and fail on second one', async () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      };

      const records = [
        { id: 1, data: { name: 'John' } },
        { id: 2, data: { name: 'Jane' } },
        { id: 3, data: {} } // Missing required field
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: records
      });

      try {
        await importBusiness.checkExistingRecordsByJsonSchema(keyId, schema);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Record with ID "3"');
      }
    });

    it('should handle numeric types with constraints', async () => {
      const schema = {
        type: 'object',
        properties: {
          age: { type: 'number', minimum: 0, maximum: 150 }
        },
        required: ['age']
      };

      const validRecords = [{ id: 1, data: { age: 25 } }];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: validRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).resolves.not.toThrow();
    });

    it('should fail when numeric value violates constraints', async () => {
      const schema = {
        type: 'object',
        properties: {
          age: { type: 'number', minimum: 0, maximum: 150 }
        },
        required: ['age']
      };

      const invalidRecords = [
        { id: 1, data: { age: 200 } } // Exceeds maximum
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).rejects.toThrow(/doesn't match JSON schema/);
    });

    it('should handle null values based on schema', async () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: ['string', 'null'] }
        }
      };

      const validRecords = [
        { id: 1, data: { name: 'John' } },
        { id: 2, data: { name: null } }
      ];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: validRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).resolves.not.toThrow();
    });

    it('should fail when null not allowed in schema', async () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      };

      const invalidRecords = [{ id: 1, data: { name: null } }];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).rejects.toThrow(/doesn't match JSON schema/);
    });

    it('should validate string patterns if defined', async () => {
      const schema = {
        type: 'object',
        properties: {
          phone: { type: 'string', pattern: '^\\d{3}-\\d{3}-\\d{4}$' }
        }
      };

      const validRecords = [{ id: 1, data: { phone: '123-456-7890' } }];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: validRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).resolves.not.toThrow();
    });

    it('should fail when string does not match pattern', async () => {
      const schema = {
        type: 'object',
        properties: {
          phone: { type: 'string', pattern: '^\\d{3}-\\d{3}-\\d{4}$' }
        }
      };

      const invalidRecords = [{ id: 1, data: { phone: 'invalid-phone' } }];

      recordModelMock.getInstance().getByKeyId = jest.fn().mockResolvedValue({
        data: invalidRecords
      });

      await expect(importBusiness.checkExistingRecordsByJsonSchema(keyId, schema)).rejects.toThrow(/doesn't match JSON schema/);
    });
  });
});
