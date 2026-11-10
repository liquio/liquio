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
  collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.spec.ts', '!src/**/*.d.ts', '!src/types/**', '!src/index.ts'],
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  coverageDirectory: 'coverage',
  bail: false,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/restore-nock.ts'],
  coverageThreshold: { global: { statements: 80, lines: 80 } },
};

module.exports = config;
