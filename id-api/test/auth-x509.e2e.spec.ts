import nock from 'nock';

import { TestApp, config } from './test_app';

describe('AuthController - x509', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
  });

  afterAll(async () => {
    await app.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  it('should setup an app successfully', async () => {
    config.redis.isEnabled = true;
    config.auth_providers.x509 = { isEnabled: true };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    config.x509 = { externalUrl: 'http://sign-tool', timeout: 500 };

    try {
      app = await TestApp.setup();
    } catch (error: any) {
      throw new Error(`Failed to setup app: ${error.toString()}`);
    }
  });

  describe('PKCS#7 Certificate Authorization (x509)', () => {
    it('should try to login with invalid credentials', async () => {
      nock('http://sign-tool').post('/x509/signature-info').once().reply(400, {
        cause: 'Invalid PKCS#7 certificate',
      });

      await app.request().post('/authorise/x509').send({ pkcs7: 'invalid' }).expect(400);
    });

    it('should try to login with valid credentials', async () => {
      nock('http://sign-tool')
        .post('/x509/signature-info')
        .once()
        .reply(200, {
          subject: {
            commonName: 'Test Person',
            organizationName: 'Liquio Test',
            countryName: 'UA',
            serialNumber: '1234567890',
          },
          issuer: {
            commonName: 'Liquio Test CA',
            organizationName: 'Liquio Test CA',
            countryName: 'UA',
          },
          serial: '1C07D16DDAE3ECF9A031DC7F5257AD25EE541683',
          signTime: '',
          content:
            'ew0KICAidXNlciI6ICJ0ZXN0dXNlciIsDQogICJlbWFpbCI6ICJ0ZXN0dXNlckBleGFtcGxlLmNvbSIsDQogICJ0aW1lc3RhbXAiOiAiMjAyNC0wNy0xN1QxOTowMDowMFoiDQp9IA==',
          pem:
            '-----BEGIN CERTIFICATE-----\n' +
            'MIIDYDCCAkigAwIBAgIUHAfRbdrj7PmgMdx/UletJe5UFoMwDQYJKoZIhvcNAQEL\n' +
            'BQAwPzELMAkGA1UEBhMCVUExFzAVBgNVBAoMDkxpcXVpbyBUZXN0IENBMRcwFQYD\n' +
            'VQQDDA5MaXF1aW8gVGVzdCBDQTAeFw0yNTA3MTgxMDE3MDVaFw0yNjA3MTgxMDE3\n' +
            'MDVaMDkxCzAJBgNVBAYTAlVBMRQwEgYDVQQKDAtMaXF1aW8gVGVzdDEUMBIGA1UE\n' +
            'AwwLVGVzdCBQZXJzb24wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCP\n' +
            'FXgHjEagXlO1dJjWMr5a+qsGrB9Y2O+xOd2oiJj0fHb8n0i9Tb8oJpZybGDsFLQ3\n' +
            'byVjl+jTh+J1BK5x2VkaXbvrHyMpbqJ8yjAayID+q3nETTqBBlMBhJno2Bk+vrhd\n' +
            '/Hijr1T67qYeoYFIFA8JMBalQQWE0E0e0gJjG4kn0o7ujIEzBqXDVVUwTX6H5iZW\n' +
            'sRV83hRiHHC+GWsBXxKlIekMpu7WISD3DFNYM/u4zYrZHLoAIuC6EQ8rEhLPZjA6\n' +
            'of45ehTNlSrSjUPMLzYBtlXPBpJVskmvraf4K/TziRYCz1+SVcmBQcgThOc1Q++o\n' +
            'u5rIZ3BkphBozTIdGH/hAgMBAAGjWjBYMAkGA1UdEwQCMAAwCwYDVR0PBAQDAgWg\n' +
            'MB0GA1UdDgQWBBQkP6jBkVCx9CWtGV0eoQkuD3j47jAfBgNVHSMEGDAWgBSBz8K7\n' +
            '0XPT2o1D66btkNEUAgFrjjANBgkqhkiG9w0BAQsFAAOCAQEAUmbnNL8iJ3cgjW1/\n' +
            'pLzjVD/KEUkl3Bue89qaN+7VUVrRvAC3aFJKnWGdN2zLH2Q4U6BEPeIuQ8ngKTCS\n' +
            'jaT4Cg3mJNcNzd8H46Nwck6kM6w1yOsBnfYK89+ZFVEr7X2ml8kRFCVlQPylcCqI\n' +
            'Ft0MlGgbnMf1jJCvYIO+9ilGvzM8gYkbDN6ST4QMcnvfw2xiJa5yWU24BtqxMfo1\n' +
            '+IFaQUy45wfuzaz0YYENjjR0oP4sRdv1k1B/xT/azVoyyS0RWxEQpQoC66/XCef0\n' +
            '59tRa7XoefAbH6d+29ILCqZCjTbeE48wUFfADtlUeXBZRpvvEC79KCVT/Sa+QCEA\n' +
            'BMQu2w==\n' +
            '-----END CERTIFICATE-----',
        });

      await app
        .request()
        .post('/authorise/x509')
        .send({ pkcs7: 'valid' })
        .expect(200)
        .expect((res) => {
          expect(res.body.error).toBeNull();
          expect(res.body.redirect).toBe('/authorise/continue/');
        });
    });
  });
});
