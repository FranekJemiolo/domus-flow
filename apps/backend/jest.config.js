/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@domus-flow/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json', 'html'],
  setupFilesAfterFramework: [],
  globalSetup: './src/__tests__/globalSetup.ts',
  globalTeardown: './src/__tests__/globalTeardown.ts',
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true,
};
