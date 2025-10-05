const DatabaseService = require('../services/DatabaseService');

module.exports = async (req, res) => {
    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        if (DatabaseService.isConnected()) {
            const analytics = await DatabaseService.getAnalytics();
            res.json(analytics);
        } else {
            res.json({ 
                error: 'Database not connected',
                fallback: {
                    totalSessions: 0,
                    activeSessions: 0,
                    totalLocations: 0,
                    lastActivity: null
                }
            });
        }
    } catch (error) {
        console.error('❌ Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};