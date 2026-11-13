import { TestApp } from './test-app';
import { Provider } from '../src/services/payment/providers/provider';

const OVERRIDE = 'Method must be override for a specific provider.';

// Base payment provider: transaction ids, amounts from the schema, redirect urls and the abstract methods.
describe('Payment provider service', () => {
  let app: TestApp;
  const provider = () => new Provider();

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  it('leaves provider specific methods to the implementation', async () => {
    await expect(provider().calculatePayment()).rejects.toThrow(OVERRIDE);
    await expect(provider().handleStatus()).rejects.toThrow(OVERRIDE);
    expect(() => provider().decodePaymentData()).toThrow(OVERRIDE);
    expect(() => provider().sendCheckRequest()).toThrow(OVERRIDE);
    expect(() => provider().unHoldPayment()).toThrow(OVERRIDE);
  });

  it('encodes and decodes a transaction id', () => {
    const id = provider().generateTransactionId('doc-1', 'pay.properties.control');
    const decoded = provider().decodeTransactionId(id);
    expect(decoded).toMatchObject({ transactionId: id, documentId: 'doc-1', paymentControlPath: 'pay.properties.control' });
    expect(decoded.timeStamp).toBeGreaterThan(0);
    expect(provider().generateUniqueOrderId()).toMatch(/^[0-9A-Z]+$/);
  });

  it('calculates the amount from recipients', () => {
    const schema = {
      properties: { pay: { recipients: [{ amount: '(document) => 5', description: '() => "Fee"', currency: 'UAH' }, { amount: '() => 0' }] } },
    };
    expect(provider().getPaymentAmount({ id: 'd' }, 'pay', schema)).toEqual([{ amount: 5, description: 'Fee', currency: 'UAH' }]);
  });

  it('calculates the amount from single formulas', () => {
    const fn = (value: string) => `() => ${value}`;
    const schema = {
      properties: {
        pay: {
          amount: fn('7'),
          description: fn('"D"'),
          orderId: fn('"O"'),
          recipient: fn('"R"'),
          payer: fn('"P"'),
          suffixFormula: fn('"S"'),
          orderNum: fn('3'),
        },
      },
    };
    const expected = { recipient: 'R', amount: 7, description: 'D', orderId: 'O', payer: 'P', orderIdSuffix: 'S', orderNum: 3 };
    expect(provider().getPaymentAmount({ id: 'd' }, 'pay', schema)).toEqual(expected);
    expect(provider().getPaymentAmount({ id: 'd' }, 'pay', schema, { isReturnOnlyList: true })).toEqual([expected]);
  });

  it('forms the front redirect url', () => {
    const url = provider().formFrontRedirectUrl(
      { taskId: 't1' },
      { frontRedirectUrl: 'https://front.example/tasks/{taskId}' },
      'step.properties.pay',
    );
    expect(url).toBe('https://front.example/tasks/t1/step');
    expect(provider().formFrontRedirectUrl({}, { frontRedirectUrl: 'https://front.example' }, '')).toBe('https://front.example');
  });

  it('splits strings and parses amounts', () => {
    expect(provider().splitString('abcdefg', 3, [])).toEqual(['abc', 'def', 'g']);
    expect(provider().splitString('', 3, ['x'])).toEqual(['x']);
    expect(provider().parseAmount(5)).toBe(5);
    expect(provider().parseAmount('1,5')).toBe(1.5);
    expect(() => provider().parseAmount('abc')).toThrow('Cannot parse amount');
    expect(() => provider().parseAmount({})).toThrow('Cannot parse amount');
  });
});
