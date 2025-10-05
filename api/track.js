// User Visit Tracking API
const { logUserVisit } = require('./database');

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

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Get user data from request
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const referer = req.headers['referer'] || 'Direct';
        const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || 'Unknown';
        const host = req.headers['host'] || 'Unknown';

        // Parse request body if provided
        let body = '';
        if (req.method === 'POST') {
            await new Promise((resolve) => {
                req.on('data', chunk => body += chunk.toString());
                req.on('end', resolve);
            });
        }

        let additionalData = {};
        try {
            if (body) {
                additionalData = JSON.parse(body);
            }
        } catch (e) {
            // Ignore parsing errors
        }

        // Create visit data
        const visitData = {
            ip: ip.split(',')[0].trim(), // Get first IP if multiple
            userAgent,
            referer,
            host,
            page: additionalData.page || '/',
            sessionId: additionalData.sessionId || generateSessionId(),
            browser: parseBrowser(userAgent),
            os: parseOS(userAgent),
            device: parseDevice(userAgent),
            country: additionalData.country || null,
            city: additionalData.city || null,
            viewport: additionalData.viewport || null,
            timezone: additionalData.timezone || null,
            language: additionalData.language || null,
            ...additionalData
        };

        // Log to MongoDB
        const result = await logUserVisit(visitData);

        res.status(200).json({
            success: true,
            visitId: result.insertedId,
            message: 'Visit logged successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Visit tracking error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log visit',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseBrowser(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
}

function parseOS(userAgent) {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Macintosh')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown';
}

function parseDevice(userAgent) {
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return 'Tablet';
    return 'Desktop';
}