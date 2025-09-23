module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/integration/**/*.test.ts', '**/?(*.)+(integration).test.ts'],
  setupFiles: ['<rootDir>/test/setup-jest.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-jest-env.ts'],
};
