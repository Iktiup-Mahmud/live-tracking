import mongoose from 'mongoose';
import { UserSession, LocationTracking, UserAnalytics } from '../models/User.js';

class DatabaseService {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            if (this.isConnected) {
                return;
            }

            const mongoUri = process.env.MONGODB_URI;
            if (!mongoUri) {
                throw new Error('MONGODB_URI not found in environment variables');
            }

            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
                connectTimeoutMS: 10000
            });

            this.isConnected = true;
            console.log('✅ Connected to MongoDB successfully!');
            console.log('🗄️ Database: lightning_tracker');

            // Set up connection event listeners
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('📡 MongoDB disconnected');
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('📡 Disconnected from MongoDB');
        }
    }

    // Create new user session when user connects
    async createUserSession(socketId, userAgent, ipAddress) {
        try {
            // Check if database is connected
            if (!this.isConnected) {
                console.log('⚠️ Database not connected, skipping user session creation');
                return null;
            }

            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Parse user agent for device info
            const deviceInfo = this.parseUserAgent(userAgent);
            
            const session = new UserSession({
                sessionId,
                socketId,
                userAgent,
                ipAddress,
                deviceInfo,
                connectionTime: new Date(),
                isActive: true
            });

            await session.save();
            console.log(`👤 New user session created: ${sessionId}`);
            
            // Create corresponding analytics record
            await this.createUserAnalytics(sessionId);
            
            return sessionId;
        } catch (error) {
            console.error('❌ Error creating user session:', error);
            return null; // Return null instead of throwing to prevent app crash
        }
    }

    // End user session when user disconnects
    async endUserSession(socketId) {
        try {
            // Check if database is connected
            if (!this.isConnected) {
                console.log('⚠️ Database not connected, skipping user session end');
                return;
            }

            const session = await UserSession.findOne({ socketId, isActive: true });
            if (session) {
                const disconnectionTime = new Date();
                const sessionDuration = Math.floor((disconnectionTime - session.connectionTime) / 1000);

                await UserSession.findByIdAndUpdate(session._id, {
                    disconnectionTime,
                    sessionDuration,
                    isActive: false
                });

                console.log(`👋 User session ended: ${session.sessionId} (${sessionDuration}s)`);
                return session.sessionId;
            }
        } catch (error) {
            console.error('❌ Error ending user session:', error);
        }
    }

    // Log location data
    async logLocationData(socketId, locationData, environmentalData) {
        try {
            // Check if database is connected
            if (!this.isConnected) {
                console.log('⚠️ Database not connected, skipping location data logging');
                return;
            }

            const session = await UserSession.findOne({ socketId, isActive: true });
            if (!session) {
                console.warn('⚠️ No active session found for location logging');
                return;
            }

            const locationRecord = new LocationTracking({
                sessionId: session.sessionId,
                socketId,
                coordinates: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    accuracy: locationData.accuracy,
                    altitude: locationData.altitude,
                    speed: locationData.speed
                },
                environmental: environmentalData,
                timestamp: new Date(locationData.timestamp)
            });

            await locationRecord.save();

            // Update analytics
            await this.updateUserAnalytics(session.sessionId, locationData);

            console.log(`📍 Location logged for session: ${session.sessionId}`);
        } catch (error) {
            console.error('❌ Error logging location data:', error);
        }
    }

    // Create analytics record
    async createUserAnalytics(sessionId) {
        try {
            const analytics = new UserAnalytics({
                sessionId,
                totalLocationUpdates: 0,
                totalDistance: 0,
                maxSpeed: 0,
                averageSpeed: 0,
                trackingDuration: 0
            });

            await analytics.save();
        } catch (error) {
            console.error('❌ Error creating user analytics:', error);
        }
    }

    // Update user analytics
    async updateUserAnalytics(sessionId, locationData) {
        try {
            const analytics = await UserAnalytics.findOne({ sessionId });
            if (!analytics) return;

            // Increment location updates
            analytics.totalLocationUpdates += 1;

            // Update max speed
            if (locationData.speed && locationData.speed > analytics.maxSpeed) {
                analytics.maxSpeed = locationData.speed * 3.6; // Convert m/s to km/h
            }

            // Set start location if this is the first update
            if (analytics.totalLocationUpdates === 1) {
                analytics.startLocation = {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude
                };
            }

            // Always update end location
            analytics.endLocation = {
                latitude: locationData.latitude,
                longitude: locationData.longitude
            };

            await analytics.save();
        } catch (error) {
            console.error('❌ Error updating user analytics:', error);
        }
    }

    // Log feature usage
    async logFeatureUsage(socketId, feature) {
        try {
            // Check if database is connected
            if (!this.isConnected) {
                console.log('⚠️ Database not connected, skipping feature usage logging');
                return;
            }

            const session = await UserSession.findOne({ socketId, isActive: true });
            if (!session) return;

            const analytics = await UserAnalytics.findOne({ sessionId: session.sessionId });
            if (!analytics) return;

            // Update feature usage
            if (analytics.featuresUsed) {
                analytics.featuresUsed[feature] = true;
                await analytics.save();
                console.log(`🎛️ Feature usage logged: ${feature} for session ${session.sessionId}`);
            }
        } catch (error) {
            console.error('❌ Error logging feature usage:', error);
        }
    }

    // Get session statistics
    async getSessionStats(sessionId) {
        try {
            const session = await UserSession.findOne({ sessionId });
            const analytics = await UserAnalytics.findOne({ sessionId });
            const locationCount = await LocationTracking.countDocuments({ sessionId });

            return {
                session,
                analytics,
                locationCount
            };
        } catch (error) {
            console.error('❌ Error getting session stats:', error);
            return null;
        }
    }

    // Get all active sessions
    async getActiveSessions() {
        try {
            return await UserSession.find({ isActive: true }).sort({ connectionTime: -1 });
        } catch (error) {
            console.error('❌ Error getting active sessions:', error);
            return [];
        }
    }

    // Get database statistics
    async getDatabaseStats() {
        try {
            const totalSessions = await UserSession.countDocuments();
            const activeSessions = await UserSession.countDocuments({ isActive: true });
            const totalLocations = await LocationTracking.countDocuments();
            const totalAnalytics = await UserAnalytics.countDocuments();

            return {
                totalSessions,
                activeSessions,
                totalLocations,
                totalAnalytics,
                dbStatus: this.isConnected ? 'Connected' : 'Disconnected'
            };
        } catch (error) {
            console.error('❌ Error getting database stats:', error);
            return null;
        }
    }

    // Parse user agent string
    parseUserAgent(userAgent) {
        if (!userAgent) return {};

        const mobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
        let browser = 'Unknown';
        let platform = 'Unknown';

        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';

        if (userAgent.includes('Windows')) platform = 'Windows';
        else if (userAgent.includes('Mac')) platform = 'macOS';
        else if (userAgent.includes('Linux')) platform = 'Linux';
        else if (userAgent.includes('Android')) platform = 'Android';
        else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';

        return {
            browser,
            platform,
            mobile,
            userAgent: userAgent.substring(0, 200) // Limit length
        };
    }
}

export default new DatabaseService();