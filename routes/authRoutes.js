import { Router } from 'express';
import { authService } from '../services/authService.js';
import { generateSuccessPage, generateErrorPage, generateNotAvailablePage } from '../utils/templates.js';

const router = Router();

// Add debug route first
router.get('/debug/auth-info', (req, res) => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    providers: {
      microsoft: authService.isClientAvailable('microsoft'),
      google: authService.isClientAvailable('google')
    },
    authServiceInitialized: authService.initialized,
    environment: {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasMsClientId: !!process.env.CLIENT_ID,
      hasMsSecret: !!process.env.CLIENT_SECRET
    }
  };
  
  res.json(debugInfo);
});

// IMPORTANT: Put specific routes BEFORE the generic :provider route
// Callback route MUST come before /auth/:provider
router.get('/auth/callback', async (req, res) => {
  try {
    console.log('🔄 Callback received');
    const { state: queryState } = req.query;
    const { state: sessionState, provider, codeVerifier } = req.session;

    if (queryState !== sessionState) {
      console.log('❌ State mismatch');
      return res.status(400).send('Invalid state parameter');
    }

    if (!provider) {
      console.log('❌ No provider in session');
      return res.status(400).send('No provider found in session');
    }

    const client = authService.getClient(provider);
    if (!client) {
      console.log(`❌ No client for ${provider}`);
      return res.status(503).send(`${provider} authentication not available`);
    }

    console.log(`🔄 Processing callback for ${provider}`);
    const callbackParams = client.callbackParams(req);
    const claims = await authService.handleCallback(provider, callbackParams, {
      codeVerifier,
      state: sessionState
    });

    console.log(`✅ Auth successful for ${provider}`);

    // Clear session data
    delete req.session.codeVerifier;
    delete req.session.state;
    delete req.session.provider;

    res.send(generateSuccessPage(claims, provider));
  } catch (error) {
    console.error('Auth callback error:', error);
    const provider = req.session.provider || 'Unknown';
    res.status(500).send(generateErrorPage(error, provider));
  }
});

// Legacy route (specific route before generic)
router.get('/auth', (req, res) => {
  console.log('🔄 Legacy /auth route accessed');
  res.redirect('/auth/microsoft');
});

// Generic auth initiation - MUST come LAST among /auth routes
router.get('/auth/:provider', async (req, res) => {
  const { provider } = req.params;
  
  console.log(`🔍 Auth request for provider: "${provider}"`);
  
  if (!['microsoft', 'google'].includes(provider)) {
    console.log(`❌ Invalid provider: ${provider}`);
    return res.status(400).send(`
      <h1>Invalid Provider: "${provider}"</h1>
      <p>Valid providers: microsoft, google</p>
      <p>If you're seeing "callback" as provider, there's a route order issue.</p>
      <p><a href="/">← Back to Home</a></p>
      <p><a href="/debug/auth-info">Debug Info</a></p>
    `);
  }

  if (!authService.isClientAvailable(provider)) {
    console.log(`❌ ${provider} client not available`);
    return res.status(503).send(generateNotAvailablePage(provider));
  }

  try {
    console.log(`📝 Generating auth params for ${provider}`);
    const authParams = authService.generateAuthParams();
    
    // Store in session
    req.session.codeVerifier = authParams.codeVerifier;
    req.session.state = authParams.state;
    req.session.provider = provider;

    const authUrl = authService.createAuthUrl(provider, authParams);
    console.log(`✅ Redirecting to ${provider} auth URL`);
    res.redirect(authUrl);
  } catch (error) {
    console.error(`${provider} auth initiation error:`, error);
    res.status(500).send(generateErrorPage(error, provider));
  }
});

export default router;