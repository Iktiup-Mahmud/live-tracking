// MongoDB User Tracking Service for Vercel
const { MongoClient } = require('mongodb');

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not configured');
    }

    try {
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db();
        cachedDb = db;
        console.log('✅ MongoDB connected successfully');
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        throw new Error(`Database connection failed: ${error.message}`);
    }
}

async function logUserVisit(visitData) {
    try {
        const db = await connectToDatabase();
        const visits = db.collection('user_visits');
        
        const visit = {
            ...visitData,
            timestamp: new Date(),
            createdAt: new Date()
        };
        
        const result = await visits.insertOne(visit);
        console.log('✅ User visit logged:', result.insertedId);
        return result;
    } catch (error) {
        console.error('❌ Failed to log user visit:', error);
        throw error;
    }
}

async function logLocationUpdate(locationData) {
    try {
        const db = await connectToDatabase();
        const locations = db.collection('location_updates');
        
        const location = {
            ...locationData,
            timestamp: new Date(),
            createdAt: new Date()
        };
        
        const result = await locations.insertOne(location);
        console.log('✅ Location update logged:', result.insertedId);
        return result;
    } catch (error) {
        console.error('❌ Failed to log location:', error);
        throw error;
    }
}

async function getAnalytics() {
    try {
        if (!process.env.MONGODB_URI) {
            return {
                error: 'MONGODB_URI not configured',
                totalVisits: 0,
                totalLocations: 0,
                recentVisitsCount: 0,
                recentVisits: [],
                mongodb: 'not configured'
            };
        }

        const db = await connectToDatabase();
        const visits = db.collection('user_visits');
        const locations = db.collection('location_updates');
        
        const [totalVisits, totalLocations, recentVisits] = await Promise.all([
            visits.countDocuments(),
            locations.countDocuments(),
            visits.find().sort({ timestamp: -1 }).limit(10).toArray()
        ]);
        
        // Get visits from last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentVisitsCount = await visits.countDocuments({
            timestamp: { $gte: oneDayAgo }
        });
        
        return {
            totalVisits,
            totalLocations,
            recentVisitsCount,
            recentVisits,
            lastUpdate: new Date().toISOString(),
            mongodb: 'connected'
        };
    } catch (error) {
        console.error('❌ Failed to get analytics:', error);
        return {
            error: `Database not connected: ${error.message}`,
            totalVisits: 0,
            totalLocations: 0,
            recentVisitsCount: 0,
            recentVisits: [],
            mongodb: 'disconnected'
        };
    }
}

module.exports = {
    logUserVisit,
    logLocationUpdate,
    getAnalytics
};