# Monster Energy OIDC Authentication Portal

A modern OIDC (OpenID Connect) authentication portal supporting Microsoft Azure AD and Google OAuth, themed for Monster Energy branding.  Built with the assistance of Claude Sonnet 4 model of GutHub co-pilot, using VSC.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Microsoft Azure account (for Azure AD)
- Google Cloud account (for Google OAuth)
- Railway account (for deployment) or local development setup

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd micro-oidc

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## 🔧 Environment Configuration

Create a `.env` file with the following variables:

```properties
# Microsoft Azure AD Configuration
CLIENT_ID=your_azure_client_id
CLIENT_SECRET=your_azure_client_secret

# Google OAuth Configuration  
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Session Configuration
SESSION_SECRET=your_super_secret_session_key_min_32_chars

# Application URL (change for production)
BASE_URL=http://localhost:3000

# Port (optional, defaults to 3000)
PORT=3000
```

## 🔐 OAuth Provider Setup

### Microsoft Azure AD Setup

1. **Go to [Azure Portal](https://portal.azure.com)**
2. **Navigate to**: Azure Active Directory → App registrations
3. **Click**: "New registration"
4. **Configure**:
   - Name: `Monster Energy OIDC Portal`
   - Supported account types: `Accounts in any organizational directory and personal Microsoft accounts`
   - Redirect URI: `Web` → `http://localhost:3000/auth/callback`
5. **Save and note the Application (client) ID**
6. **Go to**: Certificates & secrets → New client secret
7. **Save the secret value immediately** (you won't see it again)
8. **For production**: Add your production URL to redirect URIs

### Google OAuth Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a project**
3. **Enable APIs**: APIs & Services → Library → Search "Google+ API" → Enable
4. **Configure OAuth consent screen**: 
   - APIs & Services → OAuth consent screen
   - Choose "External" for testing
   - Fill required fields (app name, support email, etc.)
5. **Create credentials**:
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
   - Application type: `Web application`
   - Authorized redirect URIs: `http://localhost:3000/auth/callback`
6. **Save Client ID and Client Secret**
7. **For production**: Add your production URL to authorized redirect URIs

## 🏃‍♂️ Running Locally

### Development Mode

```bash
# Start with auto-reload
npm run dev

# Or start normally
npm start
```

Visit: `http://localhost:3000`

### HTTPS Setup (Optional for Local Development)

Some OAuth providers require HTTPS. Set up local certificates:

#### Option 1: Using mkcert (Recommended)

```bash
# Install mkcert (macOS)
brew install mkcert

# Create and install local CA
mkcert -install

# Generate certificates
mkcert localhost 127.0.0.1

# Move certificates to project
mkdir certs
mv localhost+1.pem certs/cert.pem
mv localhost+1-key.pem certs/key.pem
```

#### Option 2: Using OpenSSL

```bash
# Create certificates directory
mkdir certs
cd certs

# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate
openssl req -new -x509 -key key.pem -out cert.pem -days 365
```

When prompted, use:
- Country: `US`
- State: `Your State`
- City: `Your City`  
- Organization: `Development`
- Unit: `IT`
- **Common Name: `localhost`** (IMPORTANT!)
- Email: `your@email.com`

## ☁️ Production Deployment

### Railway Deployment

1. **Install Railway CLI**:
```bash
curl -fsSL https://railway.app/install.sh | sh
```

2. **Login and setup**:
```bash
railway login
railway init
```

3. **Set environment variables**:
```bash
railway variables set CLIENT_ID=your_azure_client_id
railway variables set CLIENT_SECRET=your_azure_client_secret
railway variables set GOOGLE_CLIENT_ID=your_google_client_id
railway variables set GOOGLE_CLIENT_SECRET=your_google_client_secret
railway variables set SESSION_SECRET=your_super_secret_session_key
railway variables set BASE_URL=https://your-app.up.railway.app
```

4. **Deploy**:
```bash
railway up
```

5. **Update OAuth provider redirect URIs** with your Railway URL:
   - Azure: `https://your-app.up.railway.app/auth/callback`
   - Google: `https://your-app.up.railway.app/auth/callback`

## 🛠️ Development

### Project Structure

``` bash
micro-oidc/
├── config/
│   └── index.js          # Configuration management
├── routes/
│   └── authRoutes.js     # Authentication routes
├── services/
│   └── authService.js    # OIDC client management
├── utils/
│   └── templates.js      # HTML template helpers
├── public/
│   └── index.html        # Frontend login page
├── test.js               # Main application file
├── package.json
└── .env                  # Environment variables
```

### Available Routes

- `GET /` - Login page
- `GET /auth/microsoft` - Microsoft authentication
- `GET /auth/google` - Google authentication  
- `GET /auth/callback` - OAuth callback handler
- `GET /debug/auth-info` - Debug information (development)
- `GET /health` - Health check endpoint

### Adding New OAuth Providers

1. **Update config** (`config/index.js`):

```javascript
newProvider: {
  clientId: process.env.NEW_PROVIDER_CLIENT_ID,
  clientSecret: process.env.NEW_PROVIDER_CLIENT_SECRET,
  issuerUrl: 'https://provider.com/.well-known/openid_configuration',
  scope: 'openid profile email'
}
```

2. **Update authService** (`services/authService.js`):

```javascript
async setupNewProvider() {
  // Add provider setup logic
}
```

3. **Update routes** (`routes/authRoutes.js`):

```javascript
// Add 'newprovider' to allowed providers array
if (!['microsoft', 'google', 'newprovider'].includes(provider)) {
```

4. **Update frontend** (`public/index.html`):

```html
<a href="/auth/newprovider" class="newprovider-signin-button">
  Sign in with New Provider
</a>
```

## 🐛 Debugging

### Debug Endpoints

Visit these URLs to troubleshoot:

- `http://localhost:3000/debug/auth-info` - Service status and configuration
- `http://localhost:3000/health` - Application health check

### Common Issues

#### "Invalid Provider" Error
- Check route order in `authRoutes.js`
- Ensure `/auth/callback` comes before `/auth/:provider`

#### "Redirect URI Mismatch"
- Verify OAuth provider redirect URIs match your BASE_URL
- Check console logs for actual vs expected URIs

#### "Client Not Available"
- Verify environment variables are set
- Check `debug/auth-info` endpoint for configuration status

#### Railway Deployment Issues
```bash
# Link to existing service
railway service

# Check deployment logs
railway logs

# Verify environment variables
railway variables
```

### Logs

```bash
# Railway logs
railway logs

# Local development
# Logs appear in console with emoji prefixes:
# 🔐 Auth-related logs
# 🌐 Route logs  
# ✅ Success logs
# ❌ Error logs
```

## 🔒 Security Notes

- **Never commit secrets** to git - use `.env` files
- **Regenerate secrets** if accidentally exposed
- **Use HTTPS** in production
- **Set secure session configuration** for production:
  ```javascript
  cookie: {
    secure: true,  // HTTPS only
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
  ```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

- Check the debug endpoints for configuration issues
- Review console logs for detailed error information
- Ensure all environment variables are properly set
- Verify OAuth provider configurations match your URLs

---
