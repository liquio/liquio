// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

export const preset = 'ts-jest/presets/js-with-ts';
export const bail = true;
export const testEnvironment = 'node';
export const testMatch = ['**/*.spec.[tj]s?(x)', '**/*.e2e-spec.[tj]s?(x)'];
export const verbose = true;
export const testPathIgnorePatterns = ['/dist/', '/node_modules/'];
export const collectCoverageFrom = ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.d.ts'];
export const coverageReporters = ['text', 'text-summary', 'json-summary', 'lcov'];
