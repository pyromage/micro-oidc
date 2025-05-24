import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';

// Mock dependencies - need to mock the client methods too
const mockClient = {
  callbackParams: jest.fn(),
  authorizationUrl: jest.fn(() => 'https://example.com/auth')
};

const mockAuthService = {
  initialize: jest.fn().mockResolvedValue(true),
  isClientAvailable: jest.fn().mockReturnValue(true),
  getClient: jest.fn().mockReturnValue(mockClient),
  generateAuthParams: jest.fn().mockReturnValue({
    codeVerifier: 'test-verifier',
    state: 'test-state'
  }),
  createAuthUrl: jest.fn().mockReturnValue('https://example.com/auth'),
  handleCallback: jest.fn()
};

const mockTemplates = {
  generateSuccessPage: jest.fn(() => '<html><body>Success Page</body></html>'),
  generateErrorPage: jest.fn(() => '<html><body>Error Page</body></html>'),
  generateNotAvailablePage: jest.fn(() => '<html><body>Not Available Page</body></html>')
};

jest.unstable_mockModule('../services/authService.js', () => ({
  authService: mockAuthService
}));

jest.unstable_mockModule('../utils/templates.js', () => mockTemplates);

jest.unstable_mockModule('../config/index.js', () => ({
  config: {
    baseUrl: 'http://localhost:3000',
    sessionSecret: 'test-secret'
  }
}));

describe('AuthRoutes Tests', () => {
  let app;
  let authRoutes;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Set up default mocks with realistic user data structure
    mockClient.callbackParams.mockReturnValue({ code: 'test-code', state: 'test-state' });
    mockAuthService.handleCallback.mockResolvedValue({
      sub: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/avatar.jpg',
      // Add other fields that your real provider returns
    });
    mockAuthService.getClient.mockReturnValue(mockClient);
    mockAuthService.isClientAvailable.mockReturnValue(true);
    
    // Import routes after mocking
    const routesModule = await import('../routes/authRoutes.js');
    authRoutes = routesModule.default;
    
    // Create test app
    app = express();
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mount auth routes
    app.use('/', authRoutes);
    
    // Add health route
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          microsoft: mockAuthService.isClientAvailable('microsoft'),
          google: mockAuthService.isClientAvailable('google')
        }
      });
    });
    
    // Add 404 handler
    app.use((req, res) => {
      res.status(404).send('<h1>Page Not Found</h1>');
    });
  });

  afterEach(() => {
    // Reset all mocks to their default state after each test
    mockAuthService.generateAuthParams.mockReturnValue({
      codeVerifier: 'test-verifier',
      state: 'test-state'
    });
    mockAuthService.createAuthUrl.mockReturnValue('https://example.com/auth');
    mockAuthService.isClientAvailable.mockReturnValue(true);
    mockAuthService.getClient.mockReturnValue(mockClient);
    mockAuthService.handleCallback.mockResolvedValue({
      sub: 'test-user',
      email: 'test@example.com',
      name: 'Test User'
    });
    mockClient.callbackParams.mockReturnValue({ code: 'test-code', state: 'test-state' });
  });

  describe('Callback Routes - Updated Logic', () => {
    test('OAuth error → handled first', async () => {
      const response = await request(app)
        .get('/auth/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied access'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Error Page');
    });

    test('No session → provider check fails', async () => {
      const response = await request(app)
        .get('/auth/callback')
        .query({
          code: 'test-code',
          state: 'test-state'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('No provider found in session');
    });

    test('With session, no state → missing state parameter', async () => {
      const agent = request.agent(app);
      await agent.get('/auth/microsoft');
      
      const response = await agent
        .get('/auth/callback')
        .query({
          code: 'test-code'
          // Missing state
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Missing state parameter');
    });

    test('With session, wrong state → invalid state parameter', async () => {
      const agent = request.agent(app);
      await agent.get('/auth/microsoft');
      
      const response = await agent
        .get('/auth/callback')
        .query({
          code: 'test-code',
          state: 'wrong-state'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid state parameter');
    });

    test('Valid flow → success', async () => {
      const agent = request.agent(app);
      await agent.get('/auth/microsoft');
      
      const response = await agent
        .get('/auth/callback')
        .query({
          code: 'test-code',
          state: 'test-state'
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Success Page');
    });
  });

  describe('Debug and Health Routes', () => {
    test('GET /debug/auth-info should return debug information', async () => {
      const response = await request(app).get('/debug/auth-info');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('environment');
      
      // Check the actual structure based on the response
      expect(response.body.providers).toHaveProperty('microsoft');
      expect(response.body.providers).toHaveProperty('google');
      expect(response.body.environment).toHaveProperty('hasMsClientId');
      expect(response.body.environment).toHaveProperty('hasMsSecret');
      expect(response.body.environment).toHaveProperty('hasGoogleClientId');
      expect(response.body.environment).toHaveProperty('hasGoogleSecret');
      
      // Verify the timestamp is a valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    test('GET /health should return service status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('microsoft');
      expect(response.body.services).toHaveProperty('google');
    });
  });

  describe('Authentication Initiation Routes', () => {
    test('GET /auth/microsoft should initiate Microsoft auth', async () => {
      const response = await request(app).get('/auth/microsoft');
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://example.com/auth');
      expect(mockAuthService.generateAuthParams).toHaveBeenCalled();
      expect(mockAuthService.createAuthUrl).toHaveBeenCalledWith('microsoft', expect.any(Object));
    });

    test('GET /auth/google should initiate Google auth', async () => {
      const response = await request(app).get('/auth/google');
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://example.com/auth');
      expect(mockAuthService.generateAuthParams).toHaveBeenCalled();
      expect(mockAuthService.createAuthUrl).toHaveBeenCalledWith('google', expect.any(Object));
    });

    test('GET /auth/invalid should return 400 for invalid provider', async () => {
      const response = await request(app).get('/auth/invalid-provider');
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid Provider');
    });

    test('GET /auth/microsoft when service unavailable should return 503', async () => {
      mockAuthService.isClientAvailable.mockReturnValueOnce(false);
      
      const response = await request(app).get('/auth/microsoft');
      
      expect(response.status).toBe(503);
      expect(response.text).toContain('Not Available');
      expect(mockTemplates.generateNotAvailablePage).toHaveBeenCalledWith('microsoft');
    });

    test('GET /auth/google when service unavailable should return 503', async () => {
      mockAuthService.isClientAvailable.mockReturnValueOnce(false);
      
      const response = await request(app).get('/auth/google');
      
      expect(response.status).toBe(503);
      expect(response.text).toContain('Not Available');
      expect(mockTemplates.generateNotAvailablePage).toHaveBeenCalledWith('google');
    });

    test('Auth initiation should handle errors gracefully', async () => {
      // Use mockImplementationOnce to avoid affecting other tests
      mockAuthService.createAuthUrl.mockImplementationOnce(() => {
        throw new Error('Auth service error');
      });
      
      const response = await request(app).get('/auth/microsoft');
      
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error');
      expect(mockTemplates.generateErrorPage).toHaveBeenCalled();
      
      // Reset the mock after this test
      mockAuthService.createAuthUrl.mockReturnValue('https://example.com/auth');
    });
  });

  describe('Session Management', () => {
    test('Session should persist data across requests', async () => {
      const agent = request.agent(app);
      
      // First request sets session
      const authResponse = await agent.get('/auth/microsoft');
      expect(authResponse.status).toBe(302);
      
      // Second request should have access to session data
      const callbackResponse = await agent
        .get('/auth/callback')
        .query({
          code: 'test-code',
          state: 'test-state'
        });
      
      expect(callbackResponse.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('Routes should handle unexpected errors', async () => {
      // Mock generateAuthParams to throw error
      mockAuthService.generateAuthParams.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const response = await request(app).get('/auth/microsoft');
      
      expect(response.status).toBe(500);
      expect(mockTemplates.generateErrorPage).toHaveBeenCalled();
    });

    test('Debug route should handle service unavailability', async () => {
      mockAuthService.isClientAvailable.mockImplementation((provider) => {
        if (provider === 'microsoft') return false;
        if (provider === 'google') return true;
        return false;
      });
      
      const response = await request(app).get('/debug/auth-info');
      
      expect(response.status).toBe(200);
      expect(response.body.providers.microsoft).toBe(false);
      expect(response.body.providers.google).toBe(true);
    });
  });

  describe('Route Order and Conflicts', () => {
    test('Specific routes should take precedence over parameterized routes', async () => {
      // Test that /auth/callback doesn't get caught by /auth/:provider
      const response = await request(app)
        .get('/auth/callback')
        .query({ error: 'test_error' });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Error Page');
    });

    test('Callback route should handle OAuth errors properly', async () => {
      // Test the OAuth error handling specifically
      const response = await request(app)
        .get('/auth/callback')
        .query({ 
          error: 'access_denied',
          error_description: 'User denied access'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Error Page');
      expect(mockTemplates.generateErrorPage).toHaveBeenCalledWith(
        'OAuth Error',
        'access_denied: User denied access'
      );
    });

    test('Callback without session or OAuth error should return session error', async () => {
      // Test that callback without session data returns appropriate error
      const response = await request(app)
        .get('/auth/callback')
        .query({
          code: 'test-code',
          state: 'test-state'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('No provider found in session');
    });

    test('Auth provider routes should work for valid providers', async () => {
      // Test that /auth/:provider works for valid providers
      const msResponse = await request(app).get('/auth/microsoft');
      expect(msResponse.status).toBe(302);
      
      const googleResponse = await request(app).get('/auth/google');
      expect(googleResponse.status).toBe(302);
    });

    test('Auth provider routes should reject invalid providers', async () => {
      // Test that /auth/:provider rejects invalid providers
      const response = await request(app).get('/auth/invalid-provider');
      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid Provider');
    });

    test('Debug routes should work correctly', async () => {
      const debugResponse = await request(app).get('/debug/auth-info');
      expect(debugResponse.status).toBe(200);
      
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);
    });
  });
});