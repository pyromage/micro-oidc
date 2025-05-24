import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Config Tests', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    
    // Clear module cache to test different configurations
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  test('should load config with environment variables', async () => {
    // Set test environment variables
    process.env.CLIENT_ID = 'test-client-id';
    process.env.CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.BASE_URL = 'https://test.example.com';
    process.env.PORT = '4000';

    const { config } = await import('../config/index.js');

    expect(config.microsoft.clientId).toBe('test-client-id');
    expect(config.microsoft.clientSecret).toBe('test-client-secret');
    expect(config.google.clientId).toBe('test-google-id');
    expect(config.google.clientSecret).toBe('test-google-secret');
    expect(config.sessionSecret).toBe('test-session-secret');
    expect(config.baseUrl).toBe('https://test.example.com');
    expect(config.port).toBe('4000');
  });

  test('should use default values when env vars not set', async () => {
    // Clear specific env vars
    delete process.env.PORT;
    delete process.env.BASE_URL;

    const { config } = await import('../config/index.js');

    expect(config.port).toBe(3000);
    expect(config.baseUrl).toContain('localhost');
  });

  test('should have correct OIDC provider configurations', async () => {
    const { config } = await import('../config/index.js');

    expect(config.microsoft.issuerUrl).toBe('https://login.microsoftonline.com/common/v2.0');
    expect(config.microsoft.scope).toBe('openid profile email');
    
    expect(config.google.issuerUrl).toBe('https://accounts.google.com');
    expect(config.google.scope).toBe('openid profile email');
  });

  test('isProduction should be based on NODE_ENV', async () => {
    process.env.NODE_ENV = 'production';
    const { isProduction: prodTrue } = await import('../config/index.js');
    expect(prodTrue).toBe(true);

    jest.resetModules();
    process.env.NODE_ENV = 'development';
    const { isProduction: prodFalse } = await import('../config/index.js');
    expect(prodFalse).toBe(false);
  });
});