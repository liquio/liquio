// Auth tokens are mandatory and there is no default, so e2e tests provide their own.
export const TEST_AUTH_USERNAME = 'e2e-user';
export const TEST_AUTH_PASSWORD = 'e2e-password-0123456789abcdef';

const token = `Basic ${Buffer.from(`${TEST_AUTH_USERNAME}:${TEST_AUTH_PASSWORD}`).toString('base64')}`;
process.env.KITSOFT_PDF_GENERATOR_auth = JSON.stringify({ basicAuthTokens: [token] });

process.env.KITSOFT_PDF_GENERATOR_server = JSON.stringify({ port: 0, bodyLimit: '2mb', defaultBodyLimit: '100kb' });
process.env.KITSOFT_PDF_GENERATOR_playwright = JSON.stringify({
  workerTimeout: 30000,
  maxWorkers: 1,
  maxConcurrentJobs: 4,
  maxQueueSize: 4,
  allowedHosts: ['assets.e2e.test', 'fonts.e2e.test', '::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '10.0.0.1'],
  consoleLogLevels: ['warning', 'error'],
  consoleLogMaxMessages: 2,
  noSandbox: false,
});
