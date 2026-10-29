export const TEST_AUTH_USERNAME = 'e2e-user';
export const TEST_AUTH_PASSWORD = 'e2e-password-0123456789';

process.env.LIQUIO_CFG_EXTERNAL_READER_auth = JSON.stringify({ basicAuthTokens: [`${TEST_AUTH_USERNAME}:${TEST_AUTH_PASSWORD}`] });
