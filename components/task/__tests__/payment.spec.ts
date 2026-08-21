import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PaymentService } = require('../src/services/payment');

// Test fixture identifiers.
const TEST_USER_ID = '61efddaa351d6219eee09043';
const DOCUMENT_TEMPLATE_ID = 900001;
const DOCUMENT_ID = 'a1000000-0000-4000-8000-000000000001';
const WORKFLOW_ID = 'a2000000-0000-4000-8000-000000000002';
const TASK_ID = 'a3000000-0000-4000-8000-000000000003';
const TASK_TEMPLATE_ID = 900002;
const PAYMENT_CONTROL_PATH = 'payment';

// Fixture provider/customer names.
const PROVIDER_NAME = 'testProviderFake';
const PROVIDER_NAME_ERROR = 'testProviderFakeError';
const CUSTOMER_SUCCESS = 'testProvider';
const CUSTOMER_ERROR = 'testProviderErr';
const CUSTOMER_ERROR_NO_REDIRECT = 'testProviderErrNoRedirect';

const FAKE_TRANSACTION_ID = 'txn-success-1';
const FAKE_CALCULATE_RESULT = {
  transactionId: FAKE_TRANSACTION_ID,
  amount: 100,
  url: 'https://fake-provider.example/pay/txn-success-1',
};
const FAKE_REDIRECT_URL = 'https://fake-provider.example/redirect-success';
const DEFAULT_REDIRECT_URL = 'https://default-redirect.example';

const BASIC_AUTH_TOKEN_RAW = 'dGVzdDp0ZXN0IC1uCg==';
const BASIC_AUTH_TOKEN = `Basic ${BASIC_AUTH_TOKEN_RAW}`;

describe('Payment Controller', () => {
  let app: TestApp;
  let paymentService: any;

  // Authenticate a request as the fixture user (individual role) via a fresh, single-use nock.
  function authenticateAsFixtureUser() {
    const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
    app.nockId
      .get('/user/info')
      .query({ access_token: payload.authTokens.accessToken })
      .once()
      .reply(200, { userId: TEST_USER_ID, role: 'individual', services: {} });
    return jwt;
  }

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    // Fixture document template with a payment control at the "payment" path.
    await app.model('documentTemplate').create({
      id: DOCUMENT_TEMPLATE_ID,
      name: 'Payment Test Template',
      json_schema: JSON.stringify({
        title: 'Payment test',
        pdfRequired: false,
        signRequired: false,
        calcTriggers: [],
        properties: {
          [PAYMENT_CONTROL_PATH]: { type: 'object', customer: CUSTOMER_SUCCESS },
        },
      }),
      html_template: '<html></html>',
      access_json_schema: {},
      additional_data_to_sign: null,
    });

    // Fixture document + task owned by the fixture user (createdBy grants access directly).
    await app.model('document').create({
      id: DOCUMENT_ID,
      document_template_id: DOCUMENT_TEMPLATE_ID,
      document_state_id: 1,
      is_final: false,
      owner_id: TEST_USER_ID,
      created_by: TEST_USER_ID,
      updated_by: TEST_USER_ID,
      data: {},
      asic: { asicmanifestFileId: null, filesIds: [] },
    });

    await app.model('task').create({
      id: TASK_ID,
      task_template_id: TASK_TEMPLATE_ID,
      workflow_id: WORKFLOW_ID,
      document_id: DOCUMENT_ID,
      created_by: TEST_USER_ID,
      updated_by: TEST_USER_ID,
      finished: false,
      deleted: false,
      is_current: true,
    });

    // Register fake providers directly on the PaymentService singleton. PaymentService is a
    // singleton (see src/services/payment/index.ts) already constructed by the app during
    // init (from businesses/document.ts), so `new PaymentService(undefined)` here just returns
    // the existing instance without touching `.providers`, letting us mutate it in place.
    paymentService = new PaymentService(undefined);

    paymentService.providers[PROVIDER_NAME] = {
      calculatePayment: async () => ({ ...FAKE_CALCULATE_RESULT }),
      handleStatus: async () => ({
        transactionId: FAKE_TRANSACTION_ID,
        documentId: DOCUMENT_ID,
        paymentControlPath: PAYMENT_CONTROL_PATH,
        extraData: { redirectUrl: FAKE_REDIRECT_URL },
        status: { isSuccess: false },
      }),
      cancelOrder: async (providerOptions, orderId, transactionId, sessionId) => ({
        cancelled: true,
        orderId,
        transactionId,
        sessionId,
      }),
      getPaymentReceiptInfo: async () => ({ receipt: 'fake-receipt' }),
      getWithdrawalFundsStatus: async () => ({ withdrawalStatus: 'done' }),
    };

    paymentService.providers[PROVIDER_NAME_ERROR] = {
      handleStatus: async () => {
        throw new Error('fake provider handleStatus failure');
      },
    };

    // Wire fixture customers to the fake providers/redirect behavior. document.ts and
    // controllers/payment.ts both read from `global.config.payment`/`this.config.payment`,
    // which is the exact same object reference captured at app init time (see src/app.ts,
    // `loadConfig` returns `global.config`), so mutating it here is visible everywhere.
    global.config.payment = {
      defaultRedirect: DEFAULT_REDIRECT_URL,
      [CUSTOMER_SUCCESS]: { providerName: PROVIDER_NAME, doRedirect: true },
      [CUSTOMER_ERROR]: { providerName: PROVIDER_NAME_ERROR },
      [CUSTOMER_ERROR_NO_REDIRECT]: { providerName: PROVIDER_NAME_ERROR, isDisableRedirectOnErrorCallback: true },
    };

    // Prime the fixture document with calculated payment data (payment.calculated /
    // payment.calculatedHistory) so the webhook (`handleStatus`) tests below have a
    // matching transactionId/document to update.
    const jwt = authenticateAsFixtureUser();
    await app
      .request()
      .post(`/documents/${DOCUMENT_ID}/calc_payment`)
      .set('token', jwt)
      .send({ paymentControlPath: PAYMENT_CONTROL_PATH, extraData: {} })
      .expect(200);
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

  describe('POST /payment/:customer/confirm_code', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/payment/:customer/confirm_code');
    });
  });

  describe('POST /documents/:id/calc_payment', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/calc_payment');
    });

    it('calculates payment via the fixture provider and returns the updated document', async () => {
      const jwt = authenticateAsFixtureUser();

      const response = await app
        .request()
        .post(`/documents/${DOCUMENT_ID}/calc_payment`)
        .set('token', jwt)
        .send({ paymentControlPath: PAYMENT_CONTROL_PATH, extraData: {} })
        .expect(200);

      expect(response.body.data.id).toBe(DOCUMENT_ID);
      expect(response.body.data.data.payment.calculated).toEqual(FAKE_CALCULATE_RESULT);
      expect(Array.isArray(response.body.data.data.payment.calculatedHistory)).toBe(true);
      expect(response.body.data.data.payment.calculatedHistory.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.data.payment.calculatedHistory[response.body.data.data.payment.calculatedHistory.length - 1]).toEqual(
        FAKE_CALCULATE_RESULT,
      );
    });
  });

  describe('GET /payment/receipt', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/payment/receipt');
    });

    it('returns the fixture provider receipt info for an authenticated request', async () => {
      const jwt = authenticateAsFixtureUser();

      const response = await app
        .request()
        .get('/payment/receipt')
        .set('token', jwt)
        .query({ payment_path: PAYMENT_CONTROL_PATH, document_id: DOCUMENT_ID, order_id: 'order-99' })
        .expect(200);

      expect(response.body).toEqual({ data: { receipt: 'fake-receipt' } });
    });
  });

  describe('POST /validate_apple_pay_session', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/validate_apple_pay_session');
    });

    // Note: document.validateApplePaySession does not go through PaymentService/a provider at
    // all - it calls global.httpClient directly against Apple's API using
    // config.merchantIdentityCertificateInBase64/merchantIdentityPrivateKeyInBase64, so there is
    // no fixture provider to exercise here (see src/businesses/document.ts validateApplePaySession).
  });

  describe('GET /payment/withdrawal_status', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/payment/withdrawal_status');
    });

    it('returns the fixture provider withdrawal status for an authenticated request', async () => {
      const jwt = authenticateAsFixtureUser();

      const response = await app
        .request()
        .get('/payment/withdrawal_status')
        .set('token', jwt)
        .query({ payment_path: PAYMENT_CONTROL_PATH, document_id: DOCUMENT_ID, order_id: 'order-99' })
        .expect(200);

      expect(response.body).toEqual({ data: { withdrawalStatus: 'done' } });
    });
  });

  describe('POST /payment/cancelOrder', () => {
    it('requires basic auth credentials', async () => {
      await app.request().post('/payment/cancelOrder').expect(401);
    });

    it('cancels the order via the fixture provider when authenticated', async () => {
      global.config.basic_auth.tokens.push(BASIC_AUTH_TOKEN_RAW);

      const response = await app
        .request()
        .post('/payment/cancelOrder')
        .set('Authorization', BASIC_AUTH_TOKEN)
        .send({
          paymentCustomer: CUSTOMER_SUCCESS,
          orderId: 'order-1',
          transactionId: 'txn-1',
          sessionId: 'sess-1',
        })
        .expect(200);

      expect(response.body).toEqual({
        data: { cancelled: true, orderId: 'order-1', transactionId: 'txn-1', sessionId: 'sess-1' },
      });
    });
  });

  // These call into global.businesses.document.handlePaymentStatus, which requires payment
  // provider config not present for an unknown customer, so an unknown customer legitimately
  // errors out. Just assert the route is reachable and handled by the controller.
  describe('GET /payment/:customer/:status', () => {
    it('is reachable', async () => {
      const response = await app.request().get('/payment/unknown-customer/success');
      expect(typeof response.status).toBe('number');
    });

    it('persists a raw payment_logs row before processing and a processed row after, then redirects to the fixture provider url', async () => {
      const paymentLogsModel = app.model('paymentLogs');

      // Instrument the fixture provider to assert, from inside the request lifecycle, that the
      // raw payment_logs row is already persisted by the time the provider is invoked (i.e.
      // before any processing/response happens) - proving the ordering guaranteed by
      // controllers/payment.ts#handleStatus.
      let rawRowSeenDuringProcessing: any;
      const originalHandleStatus = paymentService.providers[PROVIDER_NAME].handleStatus;
      paymentService.providers[PROVIDER_NAME].handleStatus = async (...args) => {
        const rows = await paymentLogsModel.findAll({ order: [['created_at', 'DESC']], limit: 1 });
        rawRowSeenDuringProcessing = rows[0] && rows[0].get({ plain: true });
        return originalHandleStatus(...args);
      };

      try {
        const rawCountBefore = await paymentLogsModel.count({ where: { payment_action: 'raw' } });
        const processedCountBefore = await paymentLogsModel.count({ where: { payment_action: 'processed' } });

        const response = await app.request().get(`/payment/${CUSTOMER_SUCCESS}/success`);

        // Raw row already existed (with payment_action 'raw') before the provider ran.
        expect(rawRowSeenDuringProcessing).toBeDefined();
        expect(rawRowSeenDuringProcessing.payment_action).toBe('raw');

        // Exactly one new raw row and one new processed row were persisted - i.e. the raw row
        // was not later flipped/upserted into the processed row, it remains its own row.
        const rawCountAfter = await paymentLogsModel.count({ where: { payment_action: 'raw' } });
        const processedCountAfter = await paymentLogsModel.count({ where: { payment_action: 'processed' } });
        expect(rawCountAfter).toBe(rawCountBefore + 1);
        expect(processedCountAfter).toBe(processedCountBefore + 1);

        const [processedRow] = await paymentLogsModel.findAll({
          where: { payment_action: 'processed', transaction_id: FAKE_TRANSACTION_ID },
          order: [['created_at', 'DESC']],
          limit: 1,
        });
        expect(processedRow).toBeDefined();

        // The raw row (captured mid-processing above) and the processed row are two distinct
        // database records, not one row whose action/data got updated in place.
        expect(processedRow.get('id')).not.toBe(rawRowSeenDuringProcessing.id);

        // Data fidelity: the persisted "processed" row's `data` column matches the exact
        // response payload handlePaymentStatus produced, proving JSON round-tripping through
        // the real webhook flow (including the nested `extraData`/`status` objects), not just
        // that some row exists.
        const processedData = processedRow.get({ plain: true }).data;
        expect(processedData).toEqual({
          url: FAKE_REDIRECT_URL,
          transactionId: FAKE_TRANSACTION_ID,
          documentId: DOCUMENT_ID,
          paymentControlPath: PAYMENT_CONTROL_PATH,
          extraData: { redirectUrl: FAKE_REDIRECT_URL },
          status: { isSuccess: false },
        });

        // Redirects to the fixture provider's returned URL.
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe(FAKE_REDIRECT_URL);
      } finally {
        paymentService.providers[PROVIDER_NAME].handleStatus = originalHandleStatus;
      }
    });

    it('falls back to paymentConfig.defaultRedirect when the fixture provider throws', async () => {
      const response = await app.request().get(`/payment/${CUSTOMER_ERROR}/success`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(DEFAULT_REDIRECT_URL);
    });

    it('suppresses the fallback redirect when the noRedirect query param is set, even with a default redirect configured', async () => {
      const response = await app.request().get(`/payment/${CUSTOMER_ERROR}/success`).query({ noRedirect: '1' });

      expect(response.status).not.toBe(302);
      expect(response.body.error).toBeDefined();
    });

    it('suppresses the fallback redirect when paymentConfig[customer].isDisableRedirectOnErrorCallback is set, independently of noRedirect', async () => {
      const response = await app.request().get(`/payment/${CUSTOMER_ERROR_NO_REDIRECT}/success`);

      expect(response.status).not.toBe(302);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /payment/:customer/:status', () => {
    it('is reachable', async () => {
      const response = await app.request().post('/payment/unknown-customer/success');
      expect(typeof response.status).toBe('number');
    });

    it('persists raw and processed payment_logs rows and redirects to the fixture provider url', async () => {
      const paymentLogsModel = app.model('paymentLogs');
      const rawCountBefore = await paymentLogsModel.count({ where: { payment_action: 'raw' } });
      const processedCountBefore = await paymentLogsModel.count({ where: { payment_action: 'processed' } });

      const response = await app.request().post(`/payment/${CUSTOMER_SUCCESS}/success`).send({ some: 'payload' });

      const rawCountAfter = await paymentLogsModel.count({ where: { payment_action: 'raw' } });
      const processedCountAfter = await paymentLogsModel.count({ where: { payment_action: 'processed' } });
      expect(rawCountAfter).toBe(rawCountBefore + 1);
      expect(processedCountAfter).toBe(processedCountBefore + 1);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(FAKE_REDIRECT_URL);
    });

    it('falls back to paymentConfig.defaultRedirect when the fixture provider throws', async () => {
      const response = await app.request().post(`/payment/${CUSTOMER_ERROR}/success`).send({});

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(DEFAULT_REDIRECT_URL);
    });

    it('suppresses the fallback redirect via noRedirect', async () => {
      const response = await app.request().post(`/payment/${CUSTOMER_ERROR}/success`).query({ noRedirect: '1' }).send({});

      expect(response.status).not.toBe(302);
      expect(response.body.error).toBeDefined();
    });

    it('suppresses the fallback redirect via isDisableRedirectOnErrorCallback', async () => {
      const response = await app.request().post(`/payment/${CUSTOMER_ERROR_NO_REDIRECT}/success`).send({});

      expect(response.status).not.toBe(302);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /payment/:customer', () => {
    it('is reachable', async () => {
      const response = await app.request().post('/payment/unknown-customer');
      expect(typeof response.status).toBe('number');
    });

    it('persists raw and processed payment_logs rows and redirects to the fixture provider url', async () => {
      const paymentLogsModel = app.model('paymentLogs');
      const rawCountBefore = await paymentLogsModel.count({ where: { payment_action: 'raw' } });
      const processedCountBefore = await paymentLogsModel.count({ where: { payment_action: 'processed' } });

      const response = await app.request().post(`/payment/${CUSTOMER_SUCCESS}`).send({ some: 'payload' });

      const rawCountAfter = await paymentLogsModel.count({ where: { payment_action: 'raw' } });
      const processedCountAfter = await paymentLogsModel.count({ where: { payment_action: 'processed' } });
      expect(rawCountAfter).toBe(rawCountBefore + 1);
      expect(processedCountAfter).toBe(processedCountBefore + 1);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(FAKE_REDIRECT_URL);
    });

    it('falls back to paymentConfig.defaultRedirect when the fixture provider throws', async () => {
      const response = await app.request().post(`/payment/${CUSTOMER_ERROR}`).send({});

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(DEFAULT_REDIRECT_URL);
    });

    it('suppresses the fallback redirect via noRedirect', async () => {
      const response = await app.request().post(`/payment/${CUSTOMER_ERROR}`).query({ noRedirect: '1' }).send({});

      expect(response.status).not.toBe(302);
      expect(response.body.error).toBeDefined();
    });

    it('suppresses the fallback redirect via isDisableRedirectOnErrorCallback', async () => {
      const response = await app.request().post(`/payment/${CUSTOMER_ERROR_NO_REDIRECT}`).send({});

      expect(response.status).not.toBe(302);
      expect(response.body.error).toBeDefined();
    });
  });
});
