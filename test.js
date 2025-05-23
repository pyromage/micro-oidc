// server.js
const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

const app = express();
app.use(session({ secret: 'your_secret', resave: false, saveUninitialized: true }));

let client;

(async () => {
  const issuer = await Issuer.discover('https://login.microsoftonline.com/common/v2.0');
  client = new issuer.Client({
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET',
    redirect_uris: ['http://localhost:3000/auth/callback'],
    response_types: ['code'],
  });
})();

app.get('/auth', (req, res) => {
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  req.session.codeVerifier = codeVerifier;

  const url = client.authorizationUrl({
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const params = client.callbackParams(req);
  const tokenSet = await client.callback('http://localhost:3000/auth/callback', params, {
    code_verifier: req.session.codeVerifier,
  });

  const userinfo = await client.userinfo(tokenSet.access_token);
  res.send(`Hello, ${userinfo.name} (${userinfo.email})`);
});

app.listen(3000, () => console.log('App running on http://localhost:3000'));
