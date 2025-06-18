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
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "openweathermap.org"],
        },
    },
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

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

// API Routes
const eventRoutes = require('./routes/events');
const weatherRoutes = require('./routes/weather');

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

// Serve the frontend for all other routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment variables loaded:');
    console.log(`- PORT: ${PORT}`);
    console.log(`- SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
    console.log(`- SUPABASE_ANON_KEY: ${supabaseKey ? '✓' : '✗'}`);
    console.log(`- OPENWEATHER_API_KEY: ${OPENWEATHER_API_KEY ? '✓' : '✗'}`);
}); 