// Shared HTML escape function
const escapeHtml = (str) => {
  if (!str) return str;
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

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

  // Safe string operations with escaping
  const displayName = escapeHtml(safeUserData.name) || 'User';
  const email = escapeHtml(safeUserData.email) || 'No email provided';
  const sub = escapeHtml(safeUserData.sub) || 'Unknown ID';
  const firstLetter = displayName.charAt ? displayName.charAt(0).toUpperCase() : 'U';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Successful</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${baseStyles}
        .avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #4CAF50;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          color: white;
          margin: 0 auto 1rem;
        }
        .details {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Authentication Successful!</h1>
        <div class="user-info">
          <div class="avatar">${firstLetter}</div>
          <div class="details">
            <h2>Welcome, ${displayName}!</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>ID:</strong> ${sub}</p>
            ${safeUserData.picture ? `<p><strong>Avatar:</strong> <img src="${escapeHtml(safeUserData.picture)}" alt="User Avatar" style="width: 32px; height: 32px; border-radius: 50%; vertical-align: middle;"></p>` : ''}
          </div>
        </div>
        <a href="/" class="back-btn">← Back to Monster Energy Portal</a>
      </div>
    </body>
    </html>
  `;
}

export function generateErrorPage(title, message) {
  // Escape HTML to prevent XSS
  const escapeHtml = (str) => {
    if (!str) return str;
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Handle both old and new signatures for backward compatibility
  let errorTitle, errorMessage;
  
  // Check if first parameter is an Error object (old signature)
  if (title && 
      typeof title === 'object' && 
      title !== null && 
      'message' in title) {
    // Old signature: generateErrorPage(error, provider)
    errorTitle = title.constructor?.name ? `${title.constructor.name} Error` : 'Error';
    errorMessage = title.message;
  } else {
    // New signature: generateErrorPage(title, message)
    errorTitle = title || 'Authentication Error';
    errorMessage = message || 'An error occurred during authentication';
  }

  // Escape the title and message for XSS prevention
  const safeTitle = escapeHtml(errorTitle);
  const safeMessage = escapeHtml(errorMessage);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Failed</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <style>${baseStyles}</style>
      <div class="message-box error">
        <h1>❌ ${safeTitle}</h1>
        <p>There was an error during the authentication process.</p>
        <p><strong>Error:</strong> ${safeMessage}</p>
        <a href="/" class="back-btn">← Back to Monster Energy Portal</a>
      </div>
    </body>
    </html>
  `;
}

export function generateNotAvailablePage(provider) {
  // Handle null/undefined/empty provider
  const safeProvider = provider || 'service';
  
  // Capitalize first letter of each word (handling hyphens and spaces)
  const providerName = safeProvider
    .split(/[-_\s]+/) // Split on hyphens, underscores, spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-');
  
  // Generate environment variable name (uppercase with underscores)
  const envVarPrefix = safeProvider.toUpperCase().replace(/[-\s]/g, '_');

  // Escape the provider name for safe display
  const safeProviderName = escapeHtml(providerName);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeProviderName} Auth Not Available</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <style>${baseStyles}</style>
      <div class="message-box warning">
        <h1>⚠️ ${safeProviderName} Authentication Not Available</h1>
        <p>${safeProviderName} OIDC is not configured yet. Please try another authentication method.</p>
        <p>To configure ${safeProviderName} authentication, please set up the following environment variables:</p>
        <ul>
          <li><code>${envVarPrefix}_CLIENT_ID</code></li>
          <li><code>${envVarPrefix}_CLIENT_SECRET</code></li>
        </ul>
        <a href="/" class="back-btn">← Back to Portal</a>
      </div>
    </body>
    </html>
  `;
}