require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for testing; restrict in production!
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Temporarily disable helmet for development
// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
//             styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
//             imgSrc: ["'self'", "data:", "openweathermap.org"],
//             connectSrc: ["'self'", "http://localhost:3000", "https://api.openweathermap.org", "https://vcpgstlpfrmnadjuxipj.supabase.co"],
//             fontSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
//             objectSrc: ["'none'"],
//             mediaSrc: ["'self'"],
//             frameSrc: ["'none'"]
//         },
//     },
// }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter); // Apply rate limiting only to API routes

// Initialize Supabase client
const supabaseUrl = 'https://vcpgstlpfrmnadjuxipj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcGdzdGxwZnJtbmFkanV4aXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDkzNzksImV4cCI6MjA2NTgyNTM3OX0.fQWmfrMEM2kbqrF47dknzVmRGZ4lZSaATwijQn07uc0';
const OPENWEATHER_API_KEY = 'e67ccacc99704e84c8cc5bb3758f294b';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test database connection
async function testDatabaseConnection() {
    try {
        const { data, error } = await supabase.from('events').select('count').limit(1);
        if (error) throw error;
        console.log('Database connection successful');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

// API Routes
const eventRoutes = require('./routes/events');
const weatherRoutes = require('./routes/weather');

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// Mount API routes under /api prefix
app.use('/api/events', eventRoutes);
app.use('/api/weather', weatherRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        status: 'success',
        message: 'Smart Event Planner API',
        version: '1.0.0',
        endpoints: {
            events: {
                create: 'POST /api/events',
                list: 'GET /api/events',
                update: 'PUT /api/events/:id',
                suitability: 'GET /api/events/:id/suitability',
                alternatives: 'GET /api/events/:id/alternatives'
            },
            weather: {
                forecast: 'GET /api/weather/:location/:date'
            }
        }
    });
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body
    });
    
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment variables loaded:');
    console.log(`- PORT: ${PORT}`);
    console.log(`- SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
    console.log(`- SUPABASE_ANON_KEY: ${supabaseKey ? '✓' : '✗'}`);
    console.log(`- OPENWEATHER_API_KEY: ${OPENWEATHER_API_KEY ? '✓' : '✗'}`);
    
    // Test database connection on startup
    await testDatabaseConnection();
}); 