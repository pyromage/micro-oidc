import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'your_secret',
  baseUrl: process.env.BASE_URL || 'https://micro-oidc-production.up.railway.app',
  
  microsoft: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    issuerUrl: 'https://login.microsoftonline.com/common/v2.0',
    scope: 'openid profile email'
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    issuerUrl: 'https://accounts.google.com',
    scope: 'openid profile email'
  }
};

export const isProduction = process.env.NODE_ENV === 'production';