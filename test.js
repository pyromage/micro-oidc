import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { authService } from './services/authService.js';
import authRoutes from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Session middleware
app.use(session({ 
  secret: config.sessionSecret,
  resave: false, 
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
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

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).send(`
    <h1>Internal Server Error</h1>
    <p>Something went wrong. Please try again later.</p>
    <a href="/">← Back to Home</a>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <h1>Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">← Back to Home</a>
  `);
});

// Initialize and start server
async function startServer() {
  try {
    await authService.initialize();
    
    app.listen(config.port, () => {
      console.log(`🚀 Monster Energy OIDC Portal running on port ${config.port}`);
      console.log(`🌐 Available at: ${config.baseUrl}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
