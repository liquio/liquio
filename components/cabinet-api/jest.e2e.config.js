/**
 * E2E jest config: extends jest.config.js, runs only tests/**\/*.e2e-spec.ts and measures coverage of src/.
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
export const preset = 'ts-jest/presets/js-with-ts';
export const bail = false;
export const testEnvironment = 'node';
export const testMatch = ['<rootDir>/tests/**/*.e2e-spec.[tj]s?(x)'];
export const verbose = true;
export const testPathIgnorePatterns = ['/dist/', '/node_modules/', '/src/controllers/test.ts'];
export const collectCoverage = true;
export const collectCoverageFrom = ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.d.ts', '!src/types/**', '!src/index.ts'];
export const coverageReporters = ['text', 'text-summary', 'json-summary', 'lcov'];
export const coverageDirectory = 'coverage';
export const coverageThreshold = {
  global: { statements: 80, lines: 80 },
};
