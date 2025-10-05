const express = require("express");
const { createServer } = require("http");
const path = require("path");
const { Server } = require("socket.io");
const dotenv = require("dotenv");

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Set view engine with correct paths for Vercel
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Store connected users in memory (note: will reset on serverless function restart)
let connectedUsers = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        connectedUsers: connectedUsers.size,
        platform: 'vercel-serverless'
    });
});

// Main routes
app.get('/', (req, res) => {
    try {
        res.render('index');
    } catch (error) {
        console.error('Error rendering index:', error);
        res.status(500).json({ 
            error: 'Error loading page',
            details: error.message,
            viewsPath: app.get('views')
        });
    }
});

app.get('/diagnostics', (req, res) => {
    try {
        res.render('diagnostics');
    } catch (error) {
        console.error('Error rendering diagnostics:', error);
        res.status(500).json({ 
            error: 'Error loading diagnostics page',
            details: error.message 
        });
    }
});

// Analytics endpoint
app.get('/admin/analytics', (req, res) => {
    res.json({
        totalSessions: connectedUsers.size,
        activeSessions: Array.from(connectedUsers.values()).filter(u => u.isTracking).length,
        totalLocations: Array.from(connectedUsers.values()).filter(u => u.lastLocation).length,
        lastActivity: new Date().toISOString(),
        platform: 'vercel-serverless'
    });
});

// Simple location update endpoint for serverless compatibility
app.post('/api/location', (req, res) => {
    try {
        const location = req.body;
        console.log('Location update received via API:', location);
        
        // Mock environmental data for Vercel deployment
        const fallbackData = {
            temperature: Math.round(15 + Math.random() * 20),
            humidity: Math.round(40 + Math.random() * 40),
            pressure: Math.round(1000 + Math.random() * 50),
            windSpeed: Math.round(Math.random() * 25),
            visibility: Math.round(5 + Math.random() * 15),
            uvIndex: Math.round(Math.random() * 11)
        };
        
        res.json({
            status: 'success',
            location: location,
            environmental: fallbackData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Location API error:', error);
        res.status(500).json({ 
            error: 'Failed to process location',
            details: error.message 
        });
    }
});

// Handle Socket.io for Vercel (simplified approach)
app.get('/socket.io/*', (req, res) => {
    res.json({
        message: 'Socket.io endpoint',
        note: 'Real-time features may be limited on serverless deployment'
    });
});

// Test route
app.get('/test', (req, res) => {
    res.json({
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        platform: 'vercel'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Application error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// Export for Vercel
module.exports = app;