/**
 * E2E configuration: runs tests/**\/*.e2e-spec.ts and measures coverage of src.
 * https://jestjs.io/docs/configuration
 */
const baseConfig = require('./jest.config');

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  testMatch: ['<rootDir>/tests/**/*.e2e-spec.[tj]s?(x)'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/commands/**',
    '!src/index.ts',
    '!src/bin/**',
  ],
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  coverageDirectory: 'coverage',
  coverageThreshold: { global: { statements: 80, lines: 80 } },
  bail: false,
  // node-fetch v3 and its dependencies are ESM only; the app loads them with a dynamic import().
  transformIgnorePatterns: ['/node_modules/(?!(raw-body|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)'],
};

module.exports = config;
