// Auth tokens are mandatory and there is no default, so e2e tests provide their own.
export const TEST_AUTH_USERNAME = 'e2e-user';
export const TEST_AUTH_PASSWORD = 'e2e-password-0123456789abcdef';

const token = `Basic ${Buffer.from(`${TEST_AUTH_USERNAME}:${TEST_AUTH_PASSWORD}`).toString('base64')}`;
process.env.KITSOFT_PDF_GENERATOR_auth = JSON.stringify({ basicAuthTokens: [token] });
