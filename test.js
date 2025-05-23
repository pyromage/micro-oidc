import express from 'express';
import session from 'express-session';
import { Issuer, generators } from 'openid-client';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(session({ 
  secret: process.env.SESSION_SECRET || 'your_secret', 
  resave: false, 
  saveUninitialized: true 
}));

// Serve static files from public directory
app.use(express.static('public'));

let client;

(async () => {
  try {
    // Discover Microsoft's OIDC issuer
    const issuer = await Issuer.discover('https://login.microsoftonline.com/common/v2.0');
    
    // Create client with the correct Railway URL
    client = new issuer.Client({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uris: ['https://micro-oidc-production.up.railway.app/auth/callback'],
      response_types: ['code'],
    });
    
    console.log('OIDC client configured successfully');
  } catch (error) {
    console.error('OIDC setup failed:', error);
    process.exit(1);
  }
})();

// Helper functions
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
  if (!client) {
    return res.status(500).send('OIDC not configured yet, please try again in a moment');
  }

  // Generate PKCE parameters
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  
  req.session.codeVerifier = codeVerifier;
  req.session.state = state;

  // Use the correct Railway URL
  const baseUrl = 'https://micro-oidc-production.up.railway.app';

  const authUrl = client.authorizationUrl({
    redirect_uri: `${baseUrl}/auth/callback`,
    scope: 'openid profile email',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  try {
    if (req.query.state !== req.session.state) {
      return res.status(400).send('Invalid state parameter');
    }

    const baseUrl = 'https://micro-oidc-production.up.railway.app';
    const params = client.callbackParams(req);
    
    const tokenSet = await client.callback(`${baseUrl}/auth/callback`, params, {
      code_verifier: req.session.codeVerifier,
      state: req.session.state,
    });

    const claims = tokenSet.claims();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Authentication Successful</title>
          <style>
              body { 
                font-family: 'Segoe UI', sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 2rem; 
                background: linear-gradient(135deg, #ff6b6b, #833ab4);
                color: #fff; 
                min-height: 100vh;
              }
              .success { 
                background: rgba(212, 237, 218, 0.9); 
                border: 1px solid #c3e6cb; 
                color: #155724; 
                padding: 1rem; 
                border-radius: 6px; 
                margin-bottom: 2rem; 
              }
              .user-info { 
                background: rgba(0, 0, 0, 0.7); 
                padding: 1.5rem; 
                border-radius: 6px; 
                border: 1px solid rgba(255, 255, 255, 0.1);
              }
              .back-btn { 
                display: inline-block; 
                background: #8BC34A; 
                color: #000; 
                padding: 10px 20px; 
                text-decoration: none; 
                border-radius: 4px; 
                margin-top: 1rem; 
                font-weight: bold; 
                transition: all 0.3s ease;
              }
              .back-btn:hover {
                background: #76b039;
                transform: translateY(-2px);
              }
          </style>
      </head>
      <body>
          <div class="success">
              <h1>✅ Authentication Successful!</h1>
              <p>You have been successfully authenticated with Microsoft.</p>
          </div>
          
          <div class="user-info">
              <h2>🔐 User Information</h2>
              <p><strong>Name:</strong> ${claims.name || 'N/A'}</p>
              <p><strong>Email:</strong> ${claims.email || claims.preferred_username || 'N/A'}</p>
              <p><strong>Subject:</strong> ${claims.sub}</p>
              <p><strong>Issued:</strong> ${new Date(claims.iat * 1000).toLocaleString()}</p>
          </div>
          
          <a href="/" class="back-btn">← Back to Monster Energy Portal</a>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Failed</title></head>
      <body style="font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: linear-gradient(135deg, #ff6b6b, #833ab4); color: #fff; min-height: 100vh;">
          <div style="background: rgba(248, 215, 218, 0.9); border: 1px solid #f5c6cb; color: #721c24; padding: 1rem; border-radius: 6px;">
              <h1>❌ Authentication Failed</h1>
              <p>There was an error during the authentication process.</p>
              <p><strong>Error:</strong> ${error.message}</p>
              <a href="/" style="display: inline-block; background: #8BC34A; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 1rem; font-weight: bold;">← Back to Monster Energy Portal</a>
          </div>
      </body>
      </html>
    `);
  }
});

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

app.listen(PORT, () => {
  console.log(`🚀 Monster Energy OIDC Portal running on port ${PORT}`);
});
