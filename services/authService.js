import { Issuer, generators } from 'openid-client';
import { config } from '../config/index.js';

class AuthService {
  constructor() {
    this.clients = {};
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.setupMicrosoft();
      await this.setupGoogle();
      this.initialized = true;
      console.log('🔐 Authentication services initialized');
    } catch (error) {
      console.error('❌ Authentication initialization failed:', error);
      throw error;
    }
  }

  async setupMicrosoft() {
    if (!config.microsoft.clientId || !config.microsoft.clientSecret) {
      console.warn('⚠️  Microsoft credentials not provided');
      return;
    }

    try {
      const issuer = await Issuer.discover(config.microsoft.issuerUrl);
      this.clients.microsoft = new issuer.Client({
        client_id: config.microsoft.clientId,
        client_secret: config.microsoft.clientSecret,
        redirect_uris: [`${config.baseUrl}/auth/callback`],
        response_types: ['code'],
      });
      console.log('✅ Microsoft OIDC client configured');
    } catch (error) {
      console.error('❌ Microsoft OIDC setup failed:', error);
      throw error;
    }
  }

  async setupGoogle() {
    if (!config.google.clientId || !config.google.clientSecret) {
      console.warn('⚠️  Google credentials not provided, skipping setup');
      return;
    }

    try {
      const issuer = await Issuer.discover(config.google.issuerUrl);
      this.clients.google = new issuer.Client({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uris: [`${config.baseUrl}/auth/callback`],
        response_types: ['code'],
      });
      console.log('✅ Google OIDC client configured');
    } catch (error) {
      console.warn('⚠️  Google OIDC setup failed:', error.message);
    }
  }

  generateAuthParams() {
    return {
      codeVerifier: generators.codeVerifier(),
      state: generators.state()
    };
  }

  getClient(provider) {
    return this.clients[provider];
  }

  isClientAvailable(provider) {
    return !!this.clients[provider];
  }

  createAuthUrl(provider, params) {
    const client = this.getClient(provider);
    if (!client) {
      throw new Error(`${provider} client not available`);
    }

    const providerConfig = config[provider];
    const codeChallenge = generators.codeChallenge(params.codeVerifier);

    return client.authorizationUrl({
      redirect_uri: `${config.baseUrl}/auth/callback`,
      scope: providerConfig.scope,
      state: params.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
  }

  async handleCallback(provider, callbackParams, sessionParams) {
    const client = this.getClient(provider);
    if (!client) {
      throw new Error(`${provider} client not available`);
    }

    const tokenSet = await client.callback(
      `${config.baseUrl}/auth/callback`,
      callbackParams,
      {
        code_verifier: sessionParams.codeVerifier,
        state: sessionParams.state,
      }
    );

    return tokenSet.claims();
  }
}

export const authService = new AuthService();