import debugFactory from 'debug';
const debug = debugFactory('test:log');

import { Provider } from './provider';

global.log = {
  save: jest.fn().mockImplementation(debug),
} as any;

const OVERRIDE_ERROR_MESSAGE = 'Method must be override for a specific provider.';

describe('Provider', () => {
  describe('abstract methods', () => {
    it('calculatePayment() rejects with the override error', async () => {
      const provider = new Provider();
      await expect(provider.calculatePayment()).rejects.toThrow(OVERRIDE_ERROR_MESSAGE);
    });

    it('handleStatus() rejects with the override error', async () => {
      const provider = new Provider();
      await expect(provider.handleStatus()).rejects.toThrow(OVERRIDE_ERROR_MESSAGE);
    });

    it('decodePaymentData() throws the override error', () => {
      const provider = new Provider();
      expect(() => provider.decodePaymentData()).toThrow(OVERRIDE_ERROR_MESSAGE);
    });

    it('sendCheckRequest() throws the override error', () => {
      const provider = new Provider();
      expect(() => provider.sendCheckRequest()).toThrow(OVERRIDE_ERROR_MESSAGE);
    });

    it('unHoldPayment() throws the override error', () => {
      const provider = new Provider();
      expect(() => provider.unHoldPayment()).toThrow(OVERRIDE_ERROR_MESSAGE);
    });
  });

  describe('generateTransactionId() / decodeTransactionId()', () => {
    it('round-trips documentId and paymentControlPath', () => {
      const provider = new Provider();
      const documentId = 'doc-123';
      const paymentControlPath = 'step1.payment';

      const transactionId = provider.generateTransactionId(documentId, paymentControlPath);
      expect(typeof transactionId).toBe('string');

      const decoded = provider.decodeTransactionId(transactionId);
      expect(decoded.documentId).toBe(documentId);
      expect(decoded.paymentControlPath).toBe(paymentControlPath);
      expect(typeof decoded.timeStamp).toBe('number');
      expect(decoded.transactionId).toBe(transactionId);
    });

    it('generates different transaction IDs for identical inputs', () => {
      const provider = new Provider();
      const id1 = provider.generateTransactionId('doc-1', 'path.a');
      const id2 = provider.generateTransactionId('doc-1', 'path.a');
      expect(id1).not.toBe(id2);
    });
  });

  describe('decodeTransactionId()', () => {
    it('parses a hand-built base64 transaction string', () => {
      const provider = new Provider();
      const raw = 'my-doc-id/my.control.path/1690000000000/randomB64==';
      const transactionId = Buffer.from(raw).toString('base64');

      const decoded = provider.decodeTransactionId(transactionId);

      expect(decoded.documentId).toBe('my-doc-id');
      expect(decoded.paymentControlPath).toBe('my.control.path');
      expect(decoded.timeStamp).toBe(1690000000000);
      expect(decoded.transactionId).toBe(transactionId);
    });
  });

  describe('getPaymentAmount()', () => {
    it('evaluates single-recipient formulas against the document (object result by default)', () => {
      const provider = new Provider();
      const document = { id: 'doc-1', amount: 42, name: 'Alice', payerName: 'Bob' };
      const jsonSchema = {
        properties: {
          payment: {
            amount: '(document) => document.amount',
            description: '(document) => `Payment for ${document.name}`',
            orderId: '(document) => `order-${document.id}`',
            recipient: '(document) => document.name',
            payer: '(document) => document.payerName',
            suffixFormula: '(document) => "suffix"',
            orderNum: '(document) => 7',
          },
        },
      };

      const result = provider.getPaymentAmount(document, 'payment', jsonSchema);

      expect(result).toEqual({
        recipient: 'Alice',
        amount: 42,
        description: 'Payment for Alice',
        orderId: 'order-doc-1',
        payer: 'Bob',
        orderIdSuffix: 'suffix',
        orderNum: 7,
      });
    });

    it('wraps the single-recipient result in an array when isReturnOnlyList is true', () => {
      const provider = new Provider();
      const document = { id: 'doc-2', amount: 10 };
      const jsonSchema = {
        properties: {
          payment: {
            amount: '(document) => document.amount',
            description: '(document) => "desc"',
            orderId: '(document) => "order-1"',
            recipient: '(document) => "recipient-1"',
            payer: '(document) => "payer-1"',
            suffixFormula: '(document) => "s"',
            orderNum: '(document) => 1',
          },
        },
      };

      const result = provider.getPaymentAmount(document, 'payment', jsonSchema, { isReturnOnlyList: true });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        recipient: 'recipient-1',
        amount: 10,
        description: 'desc',
        orderId: 'order-1',
        payer: 'payer-1',
        orderIdSuffix: 's',
        orderNum: 1,
      });
    });

    it('evaluates the recipients-list branch and filters out zero-amount recipients', () => {
      const provider = new Provider();
      const document = { id: 'doc-3', total: 100 };
      const jsonSchema = {
        properties: {
          payment: {
            recipients: [
              {
                amount: '(document) => document.total',
                name: '(document) => "recipient-a"',
                staticProp: 'static-value',
              },
              {
                amount: '(document) => 0',
                name: '(document) => "recipient-b"',
              },
            ],
          },
        },
      };

      const result = provider.getPaymentAmount(document, 'payment', jsonSchema);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        amount: 100,
        name: 'recipient-a',
        staticProp: 'static-value',
      });
    });
  });

  describe('formFrontRedirectUrl()', () => {
    it('substitutes {key} placeholders from options and appends the first path segment as a step suffix', () => {
      const provider = new Provider();
      const options = { taskId: 'task-42' };
      const paymentParams = { frontRedirectUrl: 'https://example.com/return/{taskId}' };

      const url = provider.formFrontRedirectUrl(options, paymentParams, 'step1.payment');

      expect(url).toBe('https://example.com/return/task-42/step1');
    });

    it('appends nothing when paymentControlPath has no "." segment', () => {
      const provider = new Provider();
      const options = { taskId: 'task-42' };
      const paymentParams = { frontRedirectUrl: 'https://example.com/return/{taskId}' };

      const url = provider.formFrontRedirectUrl(options, paymentParams, 'payment');

      // With no dot, `paymentControlPath` itself is the whole (and only) segment, so it's still appended.
      expect(url).toBe('https://example.com/return/task-42/payment');
    });
  });

  describe('generateUniqueOrderId()', () => {
    it('returns a string', () => {
      const provider = new Provider();
      const orderId = provider.generateUniqueOrderId();
      expect(typeof orderId).toBe('string');
    });

    it('produces no duplicates across many calls', () => {
      const provider = new Provider();
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(provider.generateUniqueOrderId());
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('splitString()', () => {
    it('returns the accumulator unchanged for an empty string (base case)', () => {
      const provider = new Provider();
      const result = provider.splitString('', 3, ['existing']);
      expect(result).toEqual(['existing']);
    });

    it('splits a string evenly divisible by partsNumber', () => {
      const provider = new Provider();
      const result = provider.splitString('abcdef', 2, []);
      expect(result).toEqual(['ab', 'cd', 'ef']);
    });

    it('leaves the last chunk shorter (not padded/dropped) when not evenly divisible', () => {
      const provider = new Provider();
      const result = provider.splitString('abcde', 2, []);
      expect(result).toEqual(['ab', 'cd', 'e']);
    });
  });

  describe('parseAmount()', () => {
    it('returns numeric input unchanged', () => {
      const provider = new Provider();
      expect(provider.parseAmount(42)).toBe(42);
      expect(provider.parseAmount(0)).toBe(0);
    });

    it('parses a valid numeric string', () => {
      const provider = new Provider();
      expect(provider.parseAmount('42.5')).toBe(42.5);
    });

    it('parses a numeric string with a comma decimal separator', () => {
      const provider = new Provider();
      expect(provider.parseAmount('12,50')).toBe(12.50);
    });

    it('throws on a malformed string', () => {
      const provider = new Provider();
      expect(() => provider.parseAmount('abc')).toThrow('Internal Error. Cannot parse amount. Amount: abc');
    });

    it('throws on a string containing letters mixed with digits', () => {
      const provider = new Provider();
      expect(() => provider.parseAmount('12a')).toThrow('Internal Error. Cannot parse amount. Amount: 12a');
    });

    it('throws on non-string/non-number input: null', () => {
      const provider = new Provider();
      expect(() => provider.parseAmount(null)).toThrow('Internal Error. Cannot parse amount. Amount: null');
    });

    it('throws on non-string/non-number input: object', () => {
      const provider = new Provider();
      expect(() => provider.parseAmount({})).toThrow('Internal Error. Cannot parse amount. Amount: [object Object]');
    });

    it('throws on non-string/non-number input: undefined', () => {
      const provider = new Provider();
      expect(() => provider.parseAmount(undefined)).toThrow('Internal Error. Cannot parse amount. Amount: undefined');
    });
  });
});
