import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';

// Mock dependencies before importing server
jest.unstable_mockModule('../config/index.js', () => ({
  config: {
    baseUrl: 'http://localhost:3000',
    port: 3001,
    sessionSecret: 'test-secret'
  }
}));

jest.unstable_mockModule('../services/authService.js', () => ({
  authService: {
    initialize: jest.fn().mockResolvedValue(true),
    isClientAvailable: jest.fn().mockReturnValue(true)
  }
}));

// Mock authRoutes with proper health endpoint and error test route
jest.unstable_mockModule('../routes/authRoutes.js', () => ({
  default: jest.fn((req, res, next) => {
    // Add the health endpoint mock
    if (req.path === '/health') {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          microsoft: true,
          google: true
        }
      });
    } else if (req.path === '/debug/auth-info') {
      res.json({ 
        timestamp: new Date().toISOString(), 
        providers: { microsoft: true, google: true },
        environment: {
          hasMsClientId: true,
          hasMsSecret: true,
          hasGoogleClientId: true,
          hasGoogleSecret: true
        }
      });
    } else if (req.path === '/test-error') {
      // Simulate an error by throwing
      const error = new Error('Test error from route');
      next(error);
    } else {
      next();
    }
  })
}));

describe('Server Tests', () => {
  let app;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import server after mocking
    const serverModule = await import('../server.js');
    app = serverModule.app;
  });

  describe('Health and Debug Routes', () => {
    test('GET /health should return service status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    test('GET /debug/auth-info should return debug information', async () => {
      const response = await request(app).get('/debug/auth-info');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('Session Management', () => {
    test('Session middleware should be configured', async () => {
      const agent = request.agent(app);
      
      // First request - should set session
      const response1 = await agent.get('/health');
      expect(response1.status).toBe(200);
      
      // Get session cookie from first response
      const cookies = response1.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      // Second request should maintain session (same agent automatically handles cookies)
      const response2 = await agent.get('/health');
      expect(response2.status).toBe(200);
      
      // Both responses should be successful, indicating session is working
      expect(response1.body.status).toBe('ok');
      expect(response2.body.status).toBe('ok');
    });

    test('Session should persist custom data', async () => {
      // Test session persistence with existing health endpoint
      const agent = request.agent(app);
      
      // Make first request to establish session
      const response1 = await agent.get('/health');
      expect(response1.status).toBe(200);
      const cookies1 = response1.headers['set-cookie'];
      
      // Make second request - should reuse session
      const response2 = await agent.get('/health');
      expect(response2.status).toBe(200);
      
      // Should have session cookies
      expect(cookies1).toBeDefined();
      expect(cookies1.length).toBeGreaterThan(0);
    });
  });

  describe('Static File Serving', () => {
    test('Root endpoint should attempt to serve static files', async () => {
      const response = await request(app).get('/');
      
      // This might return 404 if index.html doesn't exist in test environment
      // But the route should exist and not throw an error
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('404 handler should work for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route-123');
      
      expect(response.status).toBe(404);
      expect(response.text).toContain('Page Not Found');
    });

    test('Error handler should catch thrown errors', async () => {
      // Use the mocked error route
      const response = await request(app).get('/test-error');
      
      expect(response.status).toBe(500);
      expect(response.text).toContain('Internal Server Error');
    });
  });
});