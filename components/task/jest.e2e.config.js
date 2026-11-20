/**
 * E2E configuration: runs tests/**\/*.e2e-spec.ts and measures coverage of src.
 * https://jestjs.io/docs/configuration
 */
const baseConfig = require('./jest.config');

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  testMatch: ['<rootDir>/tests/**/*.e2e-spec.[tj]s?(x)'],
  // Collects the previous test file's garbage before V8 coverage starts for the next one (see the file).
  setupFiles: ['<rootDir>/tests/helpers/collect-garbage.ts'],
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
  // Recycles workers whose memory grows past the limit between test files.
  workerIdleMemoryLimit: '1GB',
  // ESM-only dependencies (raw-body 4, node-fetch 3) load natively because tests run with --experimental-vm-modules.
};

module.exports = config;
