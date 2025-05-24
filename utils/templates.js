const baseStyles = `
  body { 
    font-family: 'Segoe UI', sans-serif; 
    max-width: 800px; 
    margin: 0 auto; 
    padding: 2rem; 
    background: linear-gradient(135deg, #ff6b6b, #833ab4);
    color: #fff; 
    min-height: 100vh;
  }
  .message-box { 
    padding: 1rem; 
    border-radius: 6px; 
    margin-bottom: 2rem; 
    border: 1px solid;
  }
  .success { 
    background: rgba(212, 237, 218, 0.9); 
    border-color: #c3e6cb; 
    color: #155724; 
  }
  .error {
    background: rgba(248, 215, 218, 0.9); 
    border-color: #f5c6cb; 
    color: #721c24;
  }
  .warning {
    background: rgba(255, 193, 7, 0.9); 
    border-color: #ffeaa7; 
    color: #856404;
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
  .provider-badge {
    display: inline-block;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-left: 8px;
  }
`;

export function generateSuccessPage(userData) {
  // Add null checks and default values
  const safeUserData = {
    name: userData?.name || userData?.given_name || userData?.displayName || 'User',
    email: userData?.email || userData?.mail || userData?.userPrincipalName || 'No email provided',
    sub: userData?.sub || userData?.id || userData?.oid || 'Unknown ID',
    picture: userData?.picture || userData?.photo?.url || null,
    // Add any other fields your template expects
    ...userData
  };

  console.log('Template received user data:', JSON.stringify(safeUserData, null, 2));

  // Your existing template logic, but use safeUserData instead of userData
  // Make sure all string operations check for existence first
  const displayName = safeUserData.name || 'User';
  const firstLetter = displayName.charAt ? displayName.charAt(0).toUpperCase() : 'U';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Successful</title>
      <style>
        ${baseStyles}
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Authentication Successful!</h1>
        <div class="user-info">
          <div class="avatar">${firstLetter}</div>
          <div class="details">
            <h2>Welcome, ${safeUserData.name}!</h2>
            <p><strong>Email:</strong> ${safeUserData.email}</p>
            <p><strong>ID:</strong> ${safeUserData.sub}</p>
          </div>
        </div>
        <a href="/" class="back-btn">← Back to Monster Energy Portal</a>
      </div>
    </body>
    </html>
  `;
}

export function generateErrorPage(error, provider) {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  
  return `
    <!DOCTYPE html>
    <html>
    <head><title>Authentication Failed</title></head>
    <body>
        <style>${baseStyles}</style>
        <div class="message-box error">
            <h1>❌ ${providerName} Authentication Failed</h1>
            <p>There was an error during the ${providerName} authentication process.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <a href="/" class="back-btn">← Back to Monster Energy Portal</a>
        </div>
    </body>
    </html>
  `;
}

export function generateNotAvailablePage(provider) {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  
  return `
    <!DOCTYPE html>
    <html>
    <head><title>${providerName} Auth Not Available</title></head>
    <body>
        <style>${baseStyles}</style>
        <div class="message-box warning">
            <h1>⚠️ ${providerName} Authentication Not Available</h1>
            <p>${providerName} OIDC is not configured yet. Please try another authentication method.</p>
            <a href="/" class="back-btn">← Back to Portal</a>
        </div>
    </body>
    </html>
  `;
}