import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';

// Mock the config first
jest.unstable_mockModule('../config/index.js', () => ({
  config: {
    baseUrl: 'http://localhost:3000',
    sessionSecret: 'test-secret',
    microsoft: {
      clientId: 'test-ms-client-id',
      clientSecret: 'test-ms-secret',
      issuerUrl: 'https://login.microsoftonline.com/common/v2.0',
      scope: 'openid profile email'
    },
    google: {
      clientId: 'test-google-client-id',
      clientSecret: 'test-google-secret',
      issuerUrl: 'https://accounts.google.com',
      scope: 'openid profile email'
    }
  }
}));

// Mock the authService
const mockAuthService = {
  initialize: jest.fn().mockResolvedValue(true),
  initialized: true,
  isClientAvailable: jest.fn().mockReturnValue(true),
  getClient: jest.fn().mockReturnValue({
    authorizationUrl: jest.fn(() => 'https://example.com/auth'),
    callbackParams: jest.fn()
  }),
  generateAuthParams: jest.fn().mockReturnValue({
    codeVerifier: 'test-verifier',
    state: 'test-state'
  }),
  createAuthUrl: jest.fn().mockReturnValue('https://example.com/auth'),
  handleCallback: jest.fn().mockResolvedValue({
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  })
};

jest.unstable_mockModule('../services/authService.js', () => ({
  authService: mockAuthService
}));

// Mock template utilities
jest.unstable_mockModule('../utils/templates.js', () => ({
  generateSuccessPage: jest.fn(() => '<html>Success</html>'),
  generateErrorPage: jest.fn(() => '<html>Error</html>'),
  generateNotAvailablePage: jest.fn(() => '<html>Not Available</html>')
}));

describe('Server Tests', () => {
  let app;
  let authRoutes;

  beforeEach(async () => {
    // Import routes after mocking
    const routesModule = await import('../routes/authRoutes.js');
    authRoutes = routesModule.default;
    
    // Create test app with proper middleware
    app = express();
    
    // Add session middleware (required for auth routes)
    app.use(session({
      secret: 'test-session-secret',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    }));
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', authRoutes);
    
    // Reset mocks
    jest.clearAllMocks();
    mockAuthService.isClientAvailable.mockReturnValue(true);
  });

  describe('Basic Routes', () => {
    test('GET /debug/auth-info should return debug information', async () => {
      const response = await request(app).get('/debug/auth-info');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('providers');
    });

    test('GET /auth/microsoft should handle auth request', async () => {
      const response = await request(app).get('/auth/microsoft');
      
      // Log the response for debugging
      if (response.status !== 302) {
        console.log('Response status:', response.status);
        console.log('Response body:', response.text);
      }
      
      expect(response.status).toBe(302); // Should redirect
      expect(response.headers.location).toBe('https://example.com/auth');
      expect(mockAuthService.generateAuthParams).toHaveBeenCalled();
      expect(mockAuthService.createAuthUrl).toHaveBeenCalledWith('microsoft', expect.any(Object));
    });

    test('GET /auth/google should handle auth request', async () => {
      const response = await request(app).get('/auth/google');
      
      // Log the response for debugging
      if (response.status !== 302) {
        console.log('Response status:', response.status);
        console.log('Response body:', response.text);
      }
      
      expect(response.status).toBe(302); // Should redirect
      expect(response.headers.location).toBe('https://example.com/auth');
      expect(mockAuthService.generateAuthParams).toHaveBeenCalled();
      expect(mockAuthService.createAuthUrl).toHaveBeenCalledWith('google', expect.any(Object));
    });

    test('GET /auth/invalid should return 400', async () => {
      const response = await request(app).get('/auth/invalid');
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid Provider');
    });

    test('GET /auth/microsoft when unavailable should return 503', async () => {
      mockAuthService.isClientAvailable.mockReturnValue(false);

      const response = await request(app).get('/auth/microsoft');
      
      expect(response.status).toBe(503);
    });
  });

  describe('Callback Routes', () => {
    test('GET /auth/callback should handle successful auth', async () => {
      // Set up session data
      const agent = request.agent(app);
      
      // First, initiate auth to set session
      await agent.get('/auth/microsoft');
      
      // Then test callback
      const response = await agent
        .get('/auth/callback')
        .query({
          code: 'test-auth-code',
          state: 'test-state'
        });
      
      // Should process callback successfully
      expect(response.status).toBe(200);
      expect(response.text).toContain('Success');
    });

    test('GET /auth/callback with invalid state should fail', async () => {
      const response = await request(app)
        .get('/auth/callback')
        .query({
          code: 'test-auth-code',
          state: 'invalid-state'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid state parameter');
    });
  });
});