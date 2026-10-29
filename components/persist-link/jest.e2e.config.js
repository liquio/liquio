/**
 * E2E jest config (GITHUB-887). Counts coverage over all of src (minus the process entry) and does not bail.
 * @type {import('jest').Config}
 */
export const preset = 'ts-jest/presets/js-with-ts';
export const bail = false;
export const testEnvironment = 'node';
export const testMatch = ['<rootDir>/tests/**/*.e2e-spec.[tj]s?(x)'];
export const verbose = true;
export const testPathIgnorePatterns = ['/dist/', '/node_modules/', '/src/controllers/test.ts'];
export const collectCoverage = true;
export const collectCoverageFrom = ['src/**/*.{ts,js}', '!src/**/*.spec.ts', '!src/**/*.d.ts', '!src/types/**', '!src/app.ts'];
export const coverageReporters = ['text', 'text-summary', 'json-summary', 'lcov'];
export const coverageDirectory = 'coverage';
export const coverageThreshold = { global: { statements: 80, lines: 80 } };
