import * as base from './jest.config.js';

export default {
  ...base,
  testMatch: ['<rootDir>/tests/**/*.e2e-spec.[tj]s?(x)'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,js}', '!**/*.spec.ts', '!**/*.d.ts', '!src/types/**', '!src/index.ts'],
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  coverageDirectory: 'coverage',
  bail: false,
  coverageThreshold: { global: { statements: 80, lines: 80 } },
};
