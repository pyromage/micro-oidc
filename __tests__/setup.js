import { jest } from '@jest/globals';

// Set FAKE test environment variables - these can be public
process.env.NODE_ENV = 'test';
process.env.CLIENT_ID = 'fake-microsoft-client-id-for-testing';
process.env.CLIENT_SECRET = 'fake-microsoft-secret-for-testing';
process.env.GOOGLE_CLIENT_ID = 'fake-google-client-id-for-testing';
process.env.GOOGLE_CLIENT_SECRET = 'fake-google-secret-for-testing';
process.env.SESSION_SECRET = 'fake-session-secret-for-testing-only-not-secure';
process.env.BASE_URL = 'http://localhost:3000';
process.env.PORT = '3001';

// Mock warning about fake credentials
console.log('🧪 Using FAKE credentials for testing - not real OAuth clients');

jest.setTimeout(10000);

// Suppress console.log during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};