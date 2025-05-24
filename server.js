import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { authService } from './services/authService.js';
import authRoutes from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
export const app = express();

// Session middleware
app.use(session({ 
  secret: config.sessionSecret,
  resave: false, 
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes
app.use('/', authRoutes);

// Home route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      microsoft: authService.isClientAvailable('microsoft'),
      google: authService.isClientAvailable('google')
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <h1>Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">← Back to Home</a>
  `);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).send(`
    <h1>Internal Server Error</h1>
    <p>Something went wrong. Please try again later.</p>
    <a href="/">← Back to Home</a>
  `);
});

// Server initialization function
export async function startServer() {
  try {
    await authService.initialize();
    
    const server = app.listen(config.port, () => {
      console.log(`🚀 Monster Energy OIDC Portal running on port ${config.port}`);
      console.log(`🌐 Available at: ${config.baseUrl}`);
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is run directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
