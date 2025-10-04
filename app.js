import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const server = createServer(app);
const io = new Server(server);

// Set view engine
app.set("view engine", "ejs");

// Serve static files from public directory
app.use(express.static(path.join(path.resolve(), "public")));

// Environmental Data Service
class EnvironmentalService {
    constructor() {
        // Use environment variables for API keys (secure for GitHub)
        this.weatherApiKey = process.env.OPENWEATHER_API_KEY || 'your_openweather_api_key';
        this.airQualityApiKey = process.env.AIRQUALITY_API_KEY || 'your_airquality_api_key';
        
        // Validate API key format
        this.validateApiKey();
    }

    validateApiKey() {
        console.log('🔑 Weather API Key configured:', this.weatherApiKey.substring(0, 8) + '...');
        
        if (this.weatherApiKey === 'your_actual_api_key_here') {
            console.log('⚠️ Please configure your real OpenWeatherMap API key');
        } else if (this.weatherApiKey.length !== 32) {
            console.log('⚠️ Warning: OpenWeatherMap API keys are typically 32 characters long');
        } else {
            console.log('✅ API key format looks correct');
        }
    }

    async getWeatherData(lat, lng) {
        try {
            // Check if we have a valid API key
            if (this.weatherApiKey === 'your_actual_api_key_here') {
                console.log('🌡️ Using mock weather data (no API key configured)');
                return this.getMockWeatherData();
            }

            // For Node.js environments that don't have fetch built-in
            if (typeof fetch === 'undefined') {
                console.log('🌡️ Fetch not available, using mock weather data');
                return this.getMockWeatherData();
            }
            
            // OpenWeatherMap API call
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${this.weatherApiKey}&units=metric`;
            console.log('🌐 Calling weather API for coordinates:', lat, lng);
            
            const response = await fetch(weatherUrl);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('❌ Weather API 401 Error: Invalid API key or key not activated yet');
                    console.log('💡 Solutions:');
                    console.log('   1. Wait 10-15 minutes for new API key activation');
                    console.log('   2. Verify your email in OpenWeatherMap account');
                    console.log('   3. Check API key at: https://home.openweathermap.org/api_keys');
                    console.log('   4. Create a new API key if needed');
                    console.log('🔄 Falling back to mock weather data for now...');
                } else if (response.status === 429) {
                    console.error('❌ Weather API 429 Error: Rate limit exceeded');
                } else {
                    console.error(`❌ Weather API ${response.status} Error:`, await response.text());
                }
                
                // Fall back to mock data instead of throwing error
                console.log('🌡️ Using mock weather data due to API error');
                return this.getMockWeatherData();
            }
            
            const data = await response.json();
            console.log('✅ Real weather data received:', {
                temp: data.main.temp,
                humidity: data.main.humidity,
                location: data.name
            });
            
            return {
                temperature: Math.round(data.main.temp),
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                windSpeed: Math.round(data.wind?.speed * 3.6) || 0, // Convert m/s to km/h
                visibility: Math.round((data.visibility || 10000) / 1000), // Convert to km
                uvIndex: 0 // Would need additional API call for UV
            };
        } catch (error) {
            console.error('Weather API error:', error);
            console.log('🌡️ Using mock weather data due to error');
            return this.getMockWeatherData();
        }
    }

    async getAirQualityData(lat, lng) {
        try {
            // Air Quality API call (you can use various services)
            // For demo, returning mock data
            return this.getMockAirQualityData();
        } catch (error) {
            console.error('Air Quality API error:', error);
            return this.getMockAirQualityData();
        }
    }

    getMockWeatherData() {
        return {
            temperature: Math.round(15 + Math.random() * 20), // 15-35°C
            humidity: Math.round(40 + Math.random() * 40), // 40-80%
            pressure: Math.round(1000 + Math.random() * 50), // 1000-1050 hPa
            windSpeed: Math.round(Math.random() * 25), // 0-25 km/h
            visibility: Math.round(5 + Math.random() * 15), // 5-20 km
            uvIndex: Math.round(Math.random() * 11) // 0-11
        };
    }

    getMockAirQualityData() {
        const aqiLevels = ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Very Unhealthy'];
        return {
            aqi: aqiLevels[Math.floor(Math.random() * aqiLevels.length)],
            pm25: Math.round(10 + Math.random() * 50),
            pm10: Math.round(20 + Math.random() * 80)
        };
    }

    async getEnvironmentalData(lat, lng) {
        const weather = await this.getWeatherData(lat, lng);
        const airQuality = await this.getAirQualityData(lat, lng);
        
        return {
            ...weather,
            airQuality: airQuality.aqi,
            timestamp: new Date().toISOString()
        };
    }
}

const environmentalService = new EnvironmentalService();



app.get("/", (req, res) => 
    // res.send("Hello World!")
    res.render("index")
);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // Handle location updates with environmental data
    socket.on('locationUpdate', async (locationData) => {
        console.log('Location update received:', locationData);
        
        try {
            // Get environmental data for this location
            const environmentalData = await environmentalService.getEnvironmentalData(
                locationData.latitude, 
                locationData.longitude
            );
            
            // Combine location and environmental data
            const enhancedLocationData = {
                ...locationData,
                environmental: environmentalData
            };
            
            // Broadcast enhanced location to all connected clients
            socket.broadcast.emit('user-location-update', {
                socketId: socket.id,
                ...enhancedLocationData
            });
            
            // Send environmental data back to sender
            socket.emit('environmental-data', environmentalData);
            
            // Send acknowledgment back to sender
            socket.emit('location-received', { 
                status: 'success', 
                timestamp: new Date(),
                environmental: environmentalData
            });
            
        } catch (error) {
            console.error('Error processing location update:', error);
            socket.emit('location-received', { 
                status: 'error', 
                message: 'Failed to get environmental data' 
            });
        }
    });

    // Handle manual environmental data requests
    socket.on('request-environmental-data', async (coordinates) => {
        try {
            const environmentalData = await environmentalService.getEnvironmentalData(
                coordinates.latitude, 
                coordinates.longitude
            );
            socket.emit('environmental-data', environmentalData);
        } catch (error) {
            console.error('Error fetching environmental data:', error);
            socket.emit('environmental-data-error', { message: 'Failed to fetch environmental data' });
        }
    });
    
    // Handle device connection
    socket.on('device-connected', (deviceInfo) => {
        console.log('Device connected:', deviceInfo);
        socket.broadcast.emit('device-joined', { socketId: socket.id, deviceInfo });
    });
    
    // Handle device disconnection
    socket.on('device-disconnected', (deviceId) => {
        console.log('Device disconnected:', deviceId);
        socket.broadcast.emit('device-left', { socketId: socket.id, deviceId });
    });
    
    // Handle device status updates
    socket.on('device-status', (statusData) => {
        console.log('Device status update:', statusData);
        socket.broadcast.emit('device-status-update', { socketId: socket.id, ...statusData });
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        socket.broadcast.emit('user-disconnected', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});


