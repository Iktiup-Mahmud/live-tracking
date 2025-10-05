// Simple serverless function for Vercel
const { getAnalytics, logLocationUpdate } = require('./database');

module.exports = async (req, res) => {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        
        // Handle Vercel routing - extract original path from query params if present
        let actualPath = pathname;
        if (url.searchParams.has('pathname')) {
            actualPath = url.searchParams.get('pathname');
        }
        
        console.log('Request path:', pathname, 'Actual path:', actualPath);

        // Health check endpoint
        if (actualPath === '/health' || pathname === '/health') {
            let mongoStatus = 'not configured';
            if (process.env.MONGODB_URI) {
                try {
                    const testAnalytics = await getAnalytics();
                    mongoStatus = testAnalytics.error ? 'connection failed' : 'connected';
                } catch (error) {
                    mongoStatus = 'connection failed';
                }
            }
            
            return res.status(200).json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'production',
                platform: 'vercel-serverless',
                mongodb: mongoStatus,
                mongodbUri: process.env.MONGODB_URI ? 'configured' : 'not configured',
                requestPath: pathname,
                actualPath: actualPath
            });
        }

        // Test endpoint
        if (actualPath === '/test' || pathname === '/test') {
            return res.status(200).json({
                message: 'Server is working!',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                platform: 'vercel',
                path: pathname,
                actualPath: actualPath,
                method: req.method
            });
        }

        // Analytics endpoint with real MongoDB data
        if (actualPath === '/admin/analytics' || pathname === '/admin/analytics') {
            const analytics = await getAnalytics();
            return res.status(200).json({
                ...analytics,
                platform: 'vercel-serverless',
                requestPath: pathname,
                actualPath: actualPath
            });
        }

        // Location API endpoint
        if ((actualPath === '/api/location' || pathname === '/api/location') && req.method === 'POST') {
            let body = '';
            
            // Read request body
            await new Promise((resolve) => {
                req.on('data', chunk => body += chunk.toString());
                req.on('end', resolve);
            });

            try {
                const location = JSON.parse(body);
                console.log('Location received:', location);
                
                // Log location to MongoDB
                try {
                    await logLocationUpdate({
                        ...location,
                        ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown',
                        userAgent: req.headers['user-agent'] || 'Unknown'
                    });
                } catch (dbError) {
                    console.error('Failed to log location to DB:', dbError);
                }
                
                // Mock environmental data
                const environmentalData = {
                    temperature: Math.round(15 + Math.random() * 20),
                    humidity: Math.round(40 + Math.random() * 40),
                    pressure: Math.round(1000 + Math.random() * 50),
                    windSpeed: Math.round(Math.random() * 25),
                    visibility: Math.round(5 + Math.random() * 15),
                    uvIndex: Math.round(Math.random() * 11)
                };
                
                return res.status(200).json({
                    status: 'success',
                    location: location,
                    environmental: environmentalData,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                return res.status(400).json({ 
                    error: 'Invalid JSON body',
                    details: error.message 
                });
            }
        }

        // Default response for API info
        return res.status(200).json({
            message: 'Real-time Device Tracker API',
            timestamp: new Date().toISOString(),
            path: pathname,
            method: req.method,
            available_endpoints: [
                'GET /health - Health check',
                'GET /test - Test endpoint', 
                'GET /admin/analytics - Analytics data',
                'POST /api/location - Submit location data'
            ],
            frontend_url: 'Access the main app at the root URL'
        });

    } catch (error) {
        console.error('Serverless function error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};