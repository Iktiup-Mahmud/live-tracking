import mongoose from 'mongoose';

// User Session Schema - Tracks when users open/close the website
const userSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    socketId: {
        type: String,
        required: true
    },
    userAgent: String,
    ipAddress: String,
    country: String,
    city: String,
    connectionTime: {
        type: Date,
        default: Date.now
    },
    disconnectionTime: Date,
    sessionDuration: Number, // in seconds
    isActive: {
        type: Boolean,
        default: true
    },
    deviceInfo: {
        platform: String,
        browser: String,
        version: String,
        mobile: Boolean
    }
}, {
    timestamps: true
});

// Location Tracking Schema - Stores all GPS coordinates
const locationTrackingSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        ref: 'UserSession'
    },
    socketId: String,
    coordinates: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        accuracy: Number,
        altitude: Number,
        speed: Number
    },
    environmental: {
        temperature: Number,
        humidity: Number,
        windSpeed: Number,
        visibility: Number,
        airQuality: String,
        pressure: Number,
        uvIndex: Number
    },
    address: {
        country: String,
        state: String,
        city: String,
        district: String,
        formattedAddress: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// User Analytics Schema - Summary statistics per session
const userAnalyticsSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        ref: 'UserSession'
    },
    totalLocationUpdates: {
        type: Number,
        default: 0
    },
    totalDistance: {
        type: Number,
        default: 0 // in kilometers
    },
    maxSpeed: {
        type: Number,
        default: 0 // in km/h
    },
    averageSpeed: {
        type: Number,
        default: 0
    },
    trackingDuration: {
        type: Number,
        default: 0 // in seconds
    },
    featuresUsed: {
        satelliteView: {
            type: Boolean,
            default: false
        },
        trailMode: {
            type: Boolean,
            default: false
        },
        speedMode: {
            type: Boolean,
            default: false
        }
    },
    startLocation: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    endLocation: {
        latitude: Number,
        longitude: Number,
        address: String
    }
}, {
    timestamps: true
});

// Create indexes for better performance
userSessionSchema.index({ connectionTime: -1 });
userSessionSchema.index({ socketId: 1 });
userSessionSchema.index({ isActive: 1 });

locationTrackingSchema.index({ sessionId: 1, timestamp: -1 });
locationTrackingSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
locationTrackingSchema.index({ timestamp: -1 });

// Note: userAnalyticsSchema.sessionId already has unique:true index, no need for explicit index

// Export models
export const UserSession = mongoose.model('UserSession', userSessionSchema);
export const LocationTracking = mongoose.model('LocationTracking', locationTrackingSchema);
export const UserAnalytics = mongoose.model('UserAnalytics', userAnalyticsSchema);