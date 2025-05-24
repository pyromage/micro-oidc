import { jest, describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';

// Simple integration test without complex mocking
describe('Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    
    // Basic middleware
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true
    }));
    
    app.use(express.json());
    
    // Simple test routes
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    app.get('/test-session', (req, res) => {
      req.session.testData = 'test-value';
      res.json({ message: 'Session set', sessionId: req.sessionID });
    });
    
    app.get('/test-session-read', (req, res) => {
      res.json({ 
        testData: req.session.testData,
        sessionId: req.sessionID 
      });
    });
  });

  test('Health endpoint should work', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('Session middleware should work', async () => {
    const agent = request.agent(app);
    
    // Set session data
    const setResponse = await agent.get('/test-session');
    expect(setResponse.status).toBe(200);
    expect(setResponse.body.message).toBe('Session set');
    
    // Read session data
    const readResponse = await agent.get('/test-session-read');
    expect(readResponse.status).toBe(200);
    expect(readResponse.body.testData).toBe('test-value');
  });
});