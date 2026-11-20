const base = require('./jest.config.js');

/** @type {import('jest').Config} */
const config = {
  ...base,
  testMatch: ['<rootDir>/tests/**/*.e2e-spec.[tj]s?(x)'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.spec.ts', '!src/**/*.d.ts', '!src/types/**', '!src/index.ts'],
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  coverageDirectory: 'coverage',
  bail: false,
  coverageThreshold: { global: { statements: 80, lines: 80 } },
};

module.exports = config;
