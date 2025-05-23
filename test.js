import express from 'express';
import session from 'express-session';
import * as openidClient from 'openid-client';
import { webcrypto } from 'node:crypto';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Make crypto available globally for openid-client
globalThis.crypto = webcrypto;

const app = express();
app.use(session({ secret: 'your_secret', resave: false, saveUninitialized: true }));

// Serve static files from public directory
app.use(express.static('public'));

let config;

(async () => {
  // Discover the issuer configuration with client configuration
  config = await openidClient.discovery(
    new URL('https://login.microsoftonline.com/common/v2.0'),
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
  );
  console.log('OIDC discovery complete');
})();

// Helper function to create proper PKCE challenge
function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest();
}

app.get('/auth', (req, res) => {
  const codeVerifier = openidClient.randomPKCECodeVerifier();
  const codeChallenge = base64URLEncode(sha256(codeVerifier));
  const state = openidClient.randomState();
  
  req.session.codeVerifier = codeVerifier;
  req.session.state = state;

  const authUrl = openidClient.buildAuthorizationUrl(config, {
    redirect_uri: 'https://localhost:3000/auth/callback',
    scope: 'openid profile email',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  try {
    // Validate state parameter manually
    if (req.query.state !== req.session.state) {
      return res.status(400).send('Invalid state parameter');
    }

    // Create URL without state parameter for the library
    const callbackUrl = new URL('https://localhost:3000/auth/callback');
    callbackUrl.searchParams.set('code', req.query.code);
    
    // Exchange authorization code for tokens
    const tokens = await openidClient.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: req.session.codeVerifier,
    });

    console.log('Tokens received:', tokens);

    // Extract user info from ID token instead of calling userinfo endpoint
    const claims = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Authentication Successful</title>
          <style>
              body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
              .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 1rem; border-radius: 6px; margin-bottom: 2rem; }
              .user-info { background: #f8f9fa; padding: 1.5rem; border-radius: 6px; }
              .back-btn { display: inline-block; background: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 1rem; }
          </style>
      </head>
      <body>
          <div class="success">
              <h1>✅ Authentication Successful!</h1>
              <p>You have been successfully authenticated with Microsoft.</p>
          </div>
          
          <div class="user-info">
              <h2>User Information</h2>
              <p><strong>Name:</strong> ${claims.name || 'N/A'}</p>
              <p><strong>Email:</strong> ${claims.email || claims.preferred_username || 'N/A'}</p>
              <p><strong>Subject:</strong> ${claims.sub}</p>
          </div>
          
          <a href="/" class="back-btn">← Back to Home</a>
          
          <details style="margin-top: 2rem;">
              <summary>Raw Claims Data</summary>
              <pre style="background: #f1f1f1; padding: 1rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(claims, null, 2)}</pre>
          </details>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Failed</title></head>
      <body style="font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 1rem; border-radius: 6px;">
              <h1>❌ Authentication Failed</h1>
              <p>There was an error during the authentication process.</p>
              <a href="/" style="display: inline-block; background: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 1rem;">← Back to Home</a>
          </div>
      </body>
      </html>
    `);
  }
});

// HTTPS Server Configuration
const options = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem')
};

https.createServer(options, app).listen(3000, () => {
  console.log('App running on https://localhost:3000');
});
