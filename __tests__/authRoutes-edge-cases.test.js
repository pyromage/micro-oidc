import { jest, describe, test, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';

// Helper function to set up mocks
function setupMocks(authServiceOverrides = {}, templateOverrides = {}) {
  jest.clearAllMocks();
  jest.resetModules();

  const defaultAuthService = {
    isClientAvailable: jest.fn(() => true),
    generateAuthParams: jest.fn().mockReturnValue({
      codeVerifier: 'test-verifier',
      state: 'test-state'
    }),
    createAuthUrl: jest.fn().mockReturnValue('https://example.com/auth'),
    handleCallback: jest.fn().mockResolvedValue({
      sub: 'test-user',
      email: 'test@example.com'
    })
  };

  const defaultTemplates = {
    generateNotAvailablePage: jest.fn(() => '<html><body>Service Not Available</body></html>'),
    generateErrorPage: jest.fn(() => '<html><body>Error Page</body></html>'),
    generateSuccessPage: jest.fn(() => '<html><body>Success Page</body></html>')
  };

  const mockAuthService = { ...defaultAuthService, ...authServiceOverrides };
  const mockTemplates = { ...defaultTemplates, ...templateOverrides };

  jest.unstable_mockModule('../services/authService.js', () => ({
    authService: mockAuthService
  }));

  jest.unstable_mockModule('../utils/templates.js', () => mockTemplates);

  jest.unstable_mockModule('../config/index.js', () => ({
    config: { baseUrl: 'http://localhost:3000', sessionSecret: 'test' }
  }));

  return { mockAuthService, mockTemplates };
}

// Test with different mock scenarios
describe('AuthRoutes Edge Cases', () => {
  let app;

  test('Should handle partial service availability', async () => {
    const { mockTemplates } = setupMocks({
      isClientAvailable: jest.fn((provider) => provider === 'microsoft')
    });

    const routesModule = await import('../routes/authRoutes.js');
    
    app = express();
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    app.use('/', routesModule.default);

    // Microsoft should work
    const msResponse = await request(app).get('/auth/microsoft');
    expect(msResponse.status).toBe(302);
    expect(msResponse.headers.location).toBe('https://example.com/auth');

    // Google should not be available
    const googleResponse = await request(app).get('/auth/google');
    expect(googleResponse.status).toBe(503);
    expect(googleResponse.text).toContain('Service Not Available');
    expect(mockTemplates.generateNotAvailablePage).toHaveBeenCalledWith('google');
  });

  test('Should handle environment with missing credentials', async () => {
    setupMocks({
      isClientAvailable: jest.fn(() => false)
    });

    const routesModule = await import('../routes/authRoutes.js');
    
    app = express();
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    app.use('/', routesModule.default);

    // Check debug info shows no services available
    const debugResponse = await request(app).get('/debug/auth-info');
    expect(debugResponse.status).toBe(200);
    expect(debugResponse.body.providers.microsoft).toBe(false);
    expect(debugResponse.body.providers.google).toBe(false);
  });

  test('Should handle auth service errors in callback', async () => {
    const { mockTemplates } = setupMocks({
      handleCallback: jest.fn().mockRejectedValue(new Error('Callback failed'))
    });

    const routesModule = await import('../routes/authRoutes.js');
    
    app = express();
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    app.use('/', routesModule.default);

    // Set up session with auth data
    const agent = request.agent(app);
    await agent.get('/auth/microsoft');

    // Test callback with error
    const response = await agent
      .get('/auth/callback')
      .query({
        code: 'test-code',
        state: 'test-state'
      });

    expect(response.status).toBe(500);
    expect(mockTemplates.generateErrorPage).toHaveBeenCalled();
  });
});