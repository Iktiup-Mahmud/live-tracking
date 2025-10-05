class LightningTracker {
    constructor() {
        console.log("🚀 Seyam's Tracker initializing...");
        
        // Initialize properties
        this.socket = null;
        this.map = null;
        this.marker = null;
        this.isTracking = false;
        this.watchId = null;
        this.updateCount = 0;
        this.startTime = null;
        this.totalDistance = 0;
        this.maxSpeed = 0;
        this.lastPosition = null;
        this.trail = [];
        this.trailPolyline = null;
        this.showTrail = false;
        this.speedMode = false;
        this.isSatelliteView = false;
        this.standardLayer = null;
        this.satelliteLayer = null;
        
        // Environmental data properties
        this.environmentalData = {
            temperature: null,
            humidity: null,
            windSpeed: null,
            visibility: null,
            airQuality: null,
            pressure: null,
            uvIndex: null,
            lastUpdated: null
        };
        this.environmentalUpdateInterval = null;
        
        // Wait for all dependencies to load
        this.waitForDependencies().then(() => {
            this.initSocket();
            this.initMap();
            this.setupEvents();
            this.initInterface();
        }).catch(error => {
            console.error('❌ Failed to initialize:', error);
            alert('Failed to load required libraries. Please refresh the page.');
        });
    }
    
    async waitForDependencies() {
        console.log('⏳ Waiting for dependencies...');
        
        // Wait for Leaflet
        let attempts = 0;
        while (typeof L === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (typeof L === 'undefined') {
            throw new Error('Leaflet library failed to load');
        }
        
        // Wait for Socket.io
        attempts = 0;
        while (typeof io === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (typeof io === 'undefined') {
            throw new Error('Socket.io library failed to load');
        }
        
        console.log('✅ All dependencies loaded');
    }
    
    initSocket() {
        try {
            this.socket = io();
            console.log('✅ Socket.io initialized');
        } catch (error) {
            console.error('❌ Socket initialization failed:', error);
        }
    }

    initMap() {
        try {
            console.log('🗺️ Initializing map...');
            
            // Verify map container exists
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                throw new Error('Map container with id="map" not found');
            }
            
            console.log('✅ Map container found:', mapContainer);
            console.log('✅ Container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
            
            // Check if container has dimensions
            if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
                console.warn('⚠️ Map container has zero dimensions, forcing resize...');
                mapContainer.style.width = '100%';
                mapContainer.style.height = '100%';
                mapContainer.style.minHeight = '400px';
            }
            
            // Initialize Leaflet map
            this.map = L.map('map', {
                center: [23.8103, 90.4125],
                zoom: 13,
                zoomControl: true,
                attributionControl: true
            });
            
            console.log('✅ Leaflet map object created');
            
            // Add standard tile layer
            this.standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            });
            
            // Add satellite tile layer
            this.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 19
            });
            
            // Add standard layer by default
            this.standardLayer.addTo(this.map);
            
            // Tile loading events
            this.standardLayer.on('loading', () => {
                console.log('🔄 Map tiles loading...');
            });
            
            this.standardLayer.on('load', () => {
                console.log('✅ Map tiles loaded successfully');
            });
            
            this.standardLayer.on('tileerror', (e) => {
                console.error('❌ Tile loading error:', e);
            });
            
            // Add satellite layer events
            this.satelliteLayer.on('tileerror', (e) => {
                console.error('❌ Satellite tile loading error:', e);
            });
            
            // Force map to recognize its container size
            setTimeout(() => {
                this.map.invalidateSize();
                console.log('🔄 Map size invalidated and refreshed');
            }, 100);
            
            // Additional resize after a longer delay to ensure full layout
            setTimeout(() => {
                this.map.invalidateSize();
                console.log('🔄 Secondary map resize completed');
            }, 500);
            
            // Add a test marker to verify map is working
            this.addTestMarker();
            
            console.log('✅ Map initialization completed successfully!');
            
        } catch (error) {
            console.error('❌ Map initialization failed:', error);
            
            // Show user-friendly error
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                mapContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; 
                                color: #fff; background: #1a1a1a; text-align: center; padding: 20px;">
                        <div>
                            <h3 style="color: #ffb347; margin-bottom: 10px;">⚠️ Map Loading Error</h3>
                            <p>Failed to initialize map: ${error.message}</p>
                            <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; 
                                    background: #ffb347; color: #1a1a1a; border: none; border-radius: 5px; cursor: pointer;">
                                Reload Page
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    addTestMarker() {
        try {
            const testMarker = L.marker([23.8103, 90.4125])
                .addTo(this.map)
                .bindPopup(`
                    <div style="text-align: center;">
                        <h4>🎯 Seyam's Tracker</h4>
                        <p>Map is working correctly!</p>
                        <small>Dhaka, Bangladesh</small>
                    </div>
                `)
                .openPopup();
                
            console.log('✅ Test marker added successfully');
            
            // Auto-close popup after 3 seconds
            setTimeout(() => {
                this.map.closePopup();
            }, 3000);
            
        } catch (error) {
            console.error('❌ Failed to add test marker:', error);
        }
    }

    setupEvents() {
        console.log('⚙️ Setting up event listeners...');
        
        // Track button
        const trackBtn = document.querySelector('.track-btn');
        if (trackBtn) {
            trackBtn.addEventListener('click', () => {
                if (this.isTracking) {
                    this.stopTracking();
                } else {
                    this.startTracking();
                }
            });
            console.log('✅ Track button event listener added');
        } else {
            console.warn('⚠️ Track button not found');
        }

        // Satellite button
        const satelliteBtn = document.querySelector('.satellite-btn');
        if (satelliteBtn) {
            satelliteBtn.addEventListener('click', () => this.toggleSatelliteView());
            console.log('✅ Satellite button event listener added');
        } else {
            console.warn('⚠️ Satellite button not found');
        }

        // Trail button
        const trailBtn = document.querySelector('.trail-btn');
        if (trailBtn) {
            trailBtn.addEventListener('click', () => this.toggleTrail());
            console.log('✅ Trail button event listener added');
        } else {
            console.warn('⚠️ Trail button not found');
        }

        // Speed button
        const speedBtn = document.querySelector('.speed-btn');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => this.toggleSpeedMode());
            console.log('✅ Speed button event listener added');
        } else {
            console.warn('⚠️ Speed button not found');
        }

        // Floating control buttons
        const centerBtn = document.querySelector('#center-btn');
        if (centerBtn) {
            centerBtn.addEventListener('click', () => this.centerOnUser());
            console.log('✅ Center button event listener added');
        }

        const fullscreenBtn = document.querySelector('#fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
            console.log('✅ Fullscreen button event listener added');
        }

        const screenshotBtn = document.querySelector('#screenshot-btn');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => this.takeScreenshot());
            console.log('✅ Screenshot button event listener added');
        }

        // Socket events
        if (this.socket) {
            this.socket.on('connect', () => {
                console.log('🔗 Connected to server');
                this.updateStatus('CONNECTED');
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Disconnected from server');
                this.updateStatus('DISCONNECTED');
            });

            this.socket.on('error', (error) => {
                console.error('❌ Socket error:', error);
            });

            // Environmental data handlers
            this.socket.on('environmental-data', (data) => {
                try {
                    console.log('🌡️ Environmental data received:', data);
                    this.updateEnvironmentalData(data);
                } catch (error) {
                    console.error('❌ Error processing environmental data:', error);
                }
            });

            this.socket.on('environmental-data-error', (error) => {
                console.error('❌ Environmental data error:', error);
                this.showNotification('Failed to get environmental data', 'error');
            });

            this.socket.on('location-received', (response) => {
                try {
                    if (response.environmental) {
                        this.updateEnvironmentalData(response.environmental);
                    }
                } catch (error) {
                    console.error('❌ Error processing location response:', error);
                }
            });

            // Listen for other users' location updates and update the map
            this.socket.on('user-location-update', (data) => {
                try {
                    // Only update if not this user's own socket
                    if (data.socketId !== this.socket.id) {
                        // Optionally, show other users on the map
                        this.updateMap(data.latitude, data.longitude);
                        this.updateDisplay(data.latitude, data.longitude, data.accuracy, data.speed, data.altitude);
                        if (data.environmental) {
                            this.updateEnvironmentalData(data.environmental);
                        }
                        this.showNotification('📍 Another user location received', 'info');
                    }
                } catch (error) {
                    console.error('❌ Error processing user location update:', error);
                }
            });
        }
        
        // Add window resize handler
        window.addEventListener('resize', () => {
            if (this.map) {
                setTimeout(() => {
                    this.map.invalidateSize();
                    console.log('🔄 Map resized on window resize');
                }, 100);
            }
        });

        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        console.log('✅ Event listeners setup completed');
    }

    cleanup() {
        console.log("🧹 Cleaning up Seyam's Tracker...");
        
        // Stop tracking
        if (this.isTracking) {
            this.stopTracking();
        }
        
        // Clear environmental updates
        this.stopEnvironmentalUpdates();
        
        // Close socket connection
        if (this.socket) {
            this.socket.disconnect();
        }
        
        console.log('✅ Cleanup completed');
    }

    startTracking() {
        // Check for HTTPS/localhost requirement first
        if (location.protocol !== 'https:' && 
            location.hostname !== 'localhost' && 
            location.hostname !== '127.0.0.1') {
            this.showNotification('❌ Location access requires HTTPS or localhost', 'error');
            this.updateStatus('HTTPS REQUIRED');
            return;
        }

        if (!navigator.geolocation) {
            this.showNotification('❌ Geolocation not supported by this browser', 'error');
            this.updateStatus('GEOLOCATION UNAVAILABLE');
            return;
        }

        // Check location permissions explicitly
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                console.log('🔒 Geolocation permission status:', result.state);
                if (result.state === 'denied') {
                    this.showNotification('❌ Location permission denied. Please enable in browser settings.', 'error');
                    this.updateStatus('PERMISSION DENIED');
                    return;
                }
                this.startTrackingInternal();
            }).catch(() => {
                // Fallback for browsers without permissions API
                this.startTrackingInternal();
            });
        } else {
            this.startTrackingInternal();
        }
    }

    startTrackingInternal() {
        this.isTracking = true;
        this.startTime = Date.now();
        this.updateCount = 0;
        this.totalDistance = 0;
        this.maxSpeed = 0;
        this.trail = [];
        this.lastPosition = null;
        
        this.updateStatus('INITIALIZING GPS...');
        this.updateButton('.track-btn', '<i class="fas fa-stop"></i> STOP TRACKING', 'active');
        
        // Log feature usage
        this.logFeatureUsage('startTracking');
        
        const options = {
            enableHighAccuracy: true,
            timeout: 15000, // Reduced timeout for faster response
            maximumAge: 5000  // Reduced cache time for more accurate location
        };

        // Show requesting permission message
        this.showNotification('📍 Requesting location permission...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✅ Initial position acquired');
                this.showNotification('✅ Location access granted!', 'success');
                this.handleLocationUpdate(position);
                
                // Start watching position
                this.watchId = navigator.geolocation.watchPosition(
                    (position) => this.handleLocationUpdate(position),
                    (error) => this.handleLocationError(error),
                    options
                );
                
                this.updateStatus('TRACKING ACTIVE');
                this.showNotification('⚡ GPS tracking activated!', 'success');
                
                // Start environmental data updates
                this.startEnvironmentalUpdates();
            },
            (error) => {
                console.error('❌ Initial position error:', error);
                this.handleLocationError(error);
            },
            options
        );
    }

    stopTracking() {
        this.isTracking = false;
        
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        this.updateStatus('TRACKING STOPPED');
        this.updateButton('.track-btn', '<i class="fas fa-play"></i> START TRACKING', '');
        
        // Log feature usage
        this.logFeatureUsage('stopTracking');
        
        this.showNotification('🛑 Tracking stopped', 'info');
        
        // Stop environmental updates
        this.stopEnvironmentalUpdates();
        
        console.log('📍 Tracking stopped. Total updates:', this.updateCount);
    }

    // Log feature usage to server
    logFeatureUsage(feature) {
        if (this.socket) {
            this.socket.emit('feature-used', { feature });
            console.log(`🎛️ Feature logged: ${feature}`);
        }
    }

    handleLocationUpdate(position) {
        console.log('📍 Location update received:', position.coords);
        
        this.updateCount++;
        const { latitude, longitude, accuracy, speed, altitude } = position.coords;
        
        // Calculate distance if we have a previous position
        if (this.lastPosition) {
            const distance = this.calculateDistance(this.lastPosition, [latitude, longitude]);
            this.totalDistance += distance;
        }
        
        // Update maximum speed
        if (speed && speed > this.maxSpeed) {
            this.maxSpeed = speed;
        }
        
        // Update map and displays
        this.updateMap(latitude, longitude);
        this.updateDisplay(latitude, longitude, accuracy, speed, altitude);
        this.updateStatistics();
        
        // Add to trail if enabled
        if (this.showTrail) {
            this.addToTrail([latitude, longitude]);
        }
        
        // Store current position for distance calculation
        this.lastPosition = [latitude, longitude];
        
        // Send to server
        if (this.socket) {
            this.socket.emit('locationUpdate', {
                latitude,
                longitude,
                accuracy,
                speed,
                altitude,
                timestamp: Date.now()
            });
        }
        
        // Show speed notification in speed mode
        if (this.speedMode && speed) {
            this.showNotification(`⚡ Speed: ${(speed * 3.6).toFixed(1)} km/h`, 'info');
        }
    }

    handleLocationError(error) {
        console.error('Location error:', error);
        
        let errorMessage = 'GPS ERROR';
        let notificationMessage = '❌ Location error occurred';
        let solutions = [];
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'PERMISSION DENIED';
                notificationMessage = '❌ Location access denied.';
                solutions = [
                    '1. Click the location icon in your browser address bar',
                    '2. Select "Always allow" for location access',
                    '3. Refresh the page and try again',
                    '4. Check browser settings: Privacy → Location Services'
                ];
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'POSITION UNAVAILABLE';
                notificationMessage = '❌ Location information unavailable.';
                solutions = [
                    '1. Make sure GPS/Location Services are enabled on your device',
                    '2. Try moving to an area with better signal',
                    '3. Restart your browser',
                    '4. Check if other location apps work on your device'
                ];
                break;
            case error.TIMEOUT:
                errorMessage = 'TIMEOUT';
                notificationMessage = '❌ Location request timed out.';
                solutions = [
                    '1. Try again - GPS may need time to acquire signal',
                    '2. Move closer to a window or go outside',
                    '3. Restart location services on your device',
                    '4. Clear browser cache and cookies'
                ];
                break;
            default:
                errorMessage = 'GPS ERROR';
                notificationMessage = `❌ Location error: ${error.message}`;
                solutions = [
                    '1. Refresh the page and try again',
                    '2. Check your internet connection',
                    '3. Try using a different browser',
                    '4. Contact support if problem persists'
                ];
                break;
        }
        
        this.updateStatus(errorMessage);
        this.showNotification(notificationMessage, 'error');
        
        // Log detailed solutions to console for debugging
        console.log('🔧 Troubleshooting steps:');
        solutions.forEach(solution => console.log(`   ${solution}`));
        
        // Show permission instructions if permission denied
        if (error.code === error.PERMISSION_DENIED) {
            setTimeout(() => {
                this.showNotification('💡 Enable location in browser settings and refresh page', 'warning');
            }, 3000);
        }
        
        // Reset tracking state
        this.isTracking = false;
        this.updateButton('.track-btn', '<i class="fas fa-play"></i> START TRACKING', '');
        this.stopEnvironmentalUpdates();
    }

    updateMap(lat, lng) {
        const newPos = [lat, lng];
        
        if (this.marker) {
            this.marker.setLatLng(newPos);
        } else {
            this.marker = L.marker(newPos).addTo(this.map);
        }
        
        this.map.setView(newPos, 16);
    }

    updateDisplay(lat, lng, accuracy, speed, altitude) {
        this.updateElement('#lat-value', lat.toFixed(8));
        this.updateElement('#lng-value', lng.toFixed(8));
        this.updateElement('#alt-value', altitude ? altitude.toFixed(0) + 'm' : '--');
        this.updateElement('#speed-value', speed ? (speed * 3.6).toFixed(1) + ' km/h' : '-- km/h');
        this.updateElement('#accuracy', accuracy ? accuracy.toFixed(0) + 'm' : '--m');
    }

    updateStatistics() {
        this.updateElement('#updates-count', this.updateCount);
        this.updateElement('#total-distance', (this.totalDistance * 1000).toFixed(0) + 'm');
        this.updateElement('#max-speed', (this.maxSpeed * 3.6).toFixed(1) + ' km/h');
        
        if (this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.updateElement('#session-time', `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
    }

    calculateDistance(pos1, pos2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(pos2[0] - pos1[0]);
        const dLng = this.toRad(pos2[1] - pos1[1]);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(pos1[0])) * Math.cos(this.toRad(pos2[0])) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI/180);
    }

    toggleSatelliteView() {
        this.isSatelliteView = !this.isSatelliteView;
        
        if (this.isSatelliteView) {
            this.map.removeLayer(this.standardLayer);
            this.satelliteLayer.addTo(this.map);
            this.updateButton('.satellite-btn', '<i class="fas fa-map"></i> STANDARD VIEW', 'active');
        } else {
            this.map.removeLayer(this.satelliteLayer);
            this.standardLayer.addTo(this.map);
            this.updateButton('.satellite-btn', '<i class="fas fa-satellite"></i> SATELLITE VIEW', '');
        }
        
        // Log feature usage
        this.logFeatureUsage('satelliteView');
        
        this.showNotification(`🛰️ Switched to ${this.isSatelliteView ? 'satellite' : 'standard'} view`, 'info');
    }

    toggleTrail() {
        this.showTrail = !this.showTrail;
        
        if (!this.showTrail && this.trailPolyline) {
            this.map.removeLayer(this.trailPolyline);
            this.trail = [];
        }
        
        const btnText = this.showTrail ? '<i class="fas fa-eye-slash"></i> HIDE TRAIL' : '<i class="fas fa-route"></i> SHOW TRAIL';
        this.updateButton('.trail-btn', btnText, this.showTrail ? 'active' : '');
        
        // Log feature usage
        this.logFeatureUsage('trailMode');
        
        this.showNotification(`🛤️ Trail ${this.showTrail ? 'enabled' : 'disabled'}`, 'info');
    }

    toggleSpeedMode() {
        this.speedMode = !this.speedMode;
        const btnText = this.speedMode ? '<i class="fas fa-tachometer-alt"></i> NORMAL MODE' : '<i class="fas fa-tachometer-alt"></i> SPEED MODE';
        this.updateButton('.speed-btn', btnText, this.speedMode ? 'active' : '');
        this.showNotification(`🏎️ Speed mode ${this.speedMode ? 'enabled' : 'disabled'}`, 'info');
    }

    addToTrail(latLng) {
        this.trail.push(latLng);
        
        // Keep only last 500 points to prevent memory issues
        if (this.trail.length > 500) {
            this.trail = this.trail.slice(-500);
        }

        if (this.trailPolyline) {
            this.map.removeLayer(this.trailPolyline);
        }

        this.trailPolyline = L.polyline(this.trail, {
            color: '#ffb347',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 5'
        }).addTo(this.map);
    }

    centerOnUser() {
        if (this.marker && this.map) {
            const position = this.marker.getLatLng();
            this.map.setView(position, 18, { animate: true, duration: 1.5 });
            this.showNotification('🎯 Centered on your location', 'info');
        } else {
            this.showNotification('❌ No location available', 'warning');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.showNotification('🔲 Entered fullscreen mode', 'info');
        } else {
            document.exitFullscreen();
            this.showNotification('🔳 Exited fullscreen mode', 'info');
        }
    }

    takeScreenshot() {
        this.showNotification('📸 Screenshot feature coming soon!', 'info');
    }

    updateButton(selector, html, activeClass) {
        const button = document.querySelector(selector);
        if (button) {
            button.innerHTML = html;
            if (activeClass) {
                button.classList.add(activeClass);
            } else {
                button.classList.remove('active');
            }
        }
    }

    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `<i class="fas fa-${this.getNotificationIcon(type)}"></i><span>${message}</span>`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    updateElement(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    updateStatus(status) {
        this.updateElement('.status-text', status);
    }

    // Environmental Data Methods
    updateEnvironmentalData(data) {
        console.log('🌡️ Updating environmental display:', data);
        
        // Store the data
        this.environmentalData = {
            ...this.environmentalData,
            ...data,
            lastUpdated: new Date()
        };
        
        // Update UI elements
        this.updateElement('#temperature', `${data.temperature || '--'}°C`);
        this.updateElement('#humidity', `${data.humidity || '--'}%`);
        this.updateElement('#wind-speed', `${data.windSpeed || '--'} km/h`);
        this.updateElement('#visibility', `${data.visibility || '--'} km`);
        this.updateElement('#air-quality', data.airQuality || '--');
        this.updateElement('#pressure', `${data.pressure || '--'} hPa`);
        this.updateElement('#uv-index', data.uvIndex || '--');
        
        // Update weather item styling based on values
        this.updateEnvironmentalStyling(data);
        
        // Show notification for significant changes
        if (this.shouldNotifyEnvironmentalChange(data)) {
            this.showNotification(`🌡️ Environmental update: ${data.temperature}°C, ${data.airQuality} air quality`, 'info');
        }
    }
    
    updateEnvironmentalStyling(data) {
        // Temperature color coding
        const tempElement = document.querySelector('#temperature');
        if (tempElement && data.temperature) {
            const temp = data.temperature;
            if (temp < 0) tempElement.style.color = '#64b5f6'; // Cold - Blue
            else if (temp < 15) tempElement.style.color = '#81c784'; // Cool - Green
            else if (temp < 25) tempElement.style.color = '#ffb74d'; // Warm - Orange
            else tempElement.style.color = '#e57373'; // Hot - Red
        }
        
        // Air quality color coding
        const aqElement = document.querySelector('#air-quality');
        if (aqElement && data.airQuality) {
            const aqi = data.airQuality.toLowerCase();
            if (aqi.includes('good')) aqElement.style.color = '#81c784';
            else if (aqi.includes('moderate')) aqElement.style.color = '#ffb74d';
            else if (aqi.includes('unhealthy')) aqElement.style.color = '#e57373';
            else aqElement.style.color = '#ba68c8';
        }
        
        // Wind speed indication
        const windElement = document.querySelector('#wind-speed');
        if (windElement && data.windSpeed) {
            const wind = data.windSpeed;
            if (wind < 10) windElement.style.color = '#81c784'; // Calm
            else if (wind < 25) windElement.style.color = '#ffb74d'; // Breezy
            else windElement.style.color = '#e57373'; // Windy
        }
    }
    
    shouldNotifyEnvironmentalChange(newData) {
        if (!this.environmentalData.lastUpdated) return true; // First update
        
        // Check for significant temperature change (>5°C)
        if (Math.abs((newData.temperature || 0) - (this.environmentalData.temperature || 0)) > 5) {
            return true;
        }
        
        // Check for air quality change
        if (newData.airQuality !== this.environmentalData.airQuality) {
            return true;
        }
        
        return false;
    }
    
    requestEnvironmentalData(lat, lng) {
        if (this.socket && lat && lng) {
            console.log('🌡️ Requesting environmental data for:', lat, lng);
            this.socket.emit('request-environmental-data', { 
                latitude: lat, 
                longitude: lng 
            });
        }
    }
    
    startEnvironmentalUpdates() {
        // Update environmental data every 5 minutes
        if (this.environmentalUpdateInterval) {
            clearInterval(this.environmentalUpdateInterval);
        }
        
        this.environmentalUpdateInterval = setInterval(() => {
            if (this.lastPosition && this.isTracking) {
                this.requestEnvironmentalData(
                    this.lastPosition[0], // latitude
                    this.lastPosition[1]  // longitude
                );
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        console.log('🌡️ Environmental updates started (5-minute interval)');
    }
    
    stopEnvironmentalUpdates() {
        if (this.environmentalUpdateInterval) {
            clearInterval(this.environmentalUpdateInterval);
            this.environmentalUpdateInterval = null;
            console.log('🌡️ Environmental updates stopped');
        }
    }

    initInterface() {
        this.updateStatus('SYSTEM READY');
        console.log('🚀 Lightning Tracker interface ready!');
        
        // Run system diagnostics
        this.runDiagnostics();
    }
    
    runDiagnostics() {
        console.log('🔍 Running system diagnostics...');
        
        const diagnostics = [
            { name: 'Leaflet Library', check: () => typeof L !== 'undefined', result: null },
            { name: 'Socket.io Library', check: () => typeof io !== 'undefined', result: null },
            { name: 'Map Container', check: () => document.getElementById('map') !== null, result: null },
            { name: 'Map Object', check: () => this.map !== null, result: null },
            { name: 'Geolocation API', check: () => navigator.geolocation !== undefined, result: null },
            { name: 'HTTPS/Localhost', check: () => location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1', result: null },
            { name: 'Location Permissions', check: () => this.checkLocationPermissions(), result: null }
        ];
        
        let allPassed = true;
        
        diagnostics.forEach(test => {
            try {
                test.result = test.check();
                console.log(`${test.result ? '✅' : '❌'} ${test.name}: ${test.result ? 'PASS' : 'FAIL'}`);
                if (!test.result) allPassed = false;
            } catch (error) {
                test.result = false;
                console.log(`❌ ${test.name}: ERROR - ${error.message}`);
                allPassed = false;
            }
        });
        
        // Additional environment checks
        console.log('🌐 Environment Info:');
        console.log(`   Protocol: ${location.protocol}`);
        console.log(`   Host: ${location.hostname}`);
        console.log(`   User Agent: ${navigator.userAgent.substring(0, 100)}...`);
        console.log(`   Platform: ${navigator.platform}`);
        console.log(`   Language: ${navigator.language}`);
        
        if (allPassed) {
            console.log('🎉 All diagnostics passed! System is fully operational.');
            this.showNotification('✅ System diagnostic: All checks passed!', 'success');
            this.addDebugFunctions();
        } else {
            console.error('🚨 Some diagnostics failed. Check the issues above.');
            const failedTests = diagnostics.filter(t => !t.result).map(t => t.name);
            console.error('❌ Failed tests:', failedTests.join(', '));
            this.showNotification(`⚠️ System issues detected: ${failedTests.join(', ')}`, 'warning');
            
            // Provide specific guidance
            if (failedTests.includes('HTTPS/Localhost')) {
                console.log('💡 Solution: Access via HTTPS or localhost for geolocation to work');
                this.showNotification('💡 Use HTTPS or localhost for location access', 'warning');
            }
            if (failedTests.includes('Geolocation API')) {
                console.log('💡 Solution: Update to a modern browser with geolocation support');
            }
        }
        
        return allPassed;
    }
    
    checkLocationPermissions() {
        // This is a basic check - actual permission check happens during geolocation request
        return navigator.geolocation !== undefined && 
               (location.protocol === 'https:' || 
                location.hostname === 'localhost' || 
                location.hostname === '127.0.0.1');
    }
    
    addDebugFunctions() {
        // Add global debug functions for testing
        window.testLocation = () => this.testLocation();
        window.debugMap = () => this.debugMap();
        window.forceMapResize = () => this.forceMapResize();
        window.runDiagnostics = () => this.runDiagnostics();
        
        console.log('�️ Debug functions added: testLocation(), debugMap(), forceMapResize(), runDiagnostics()');
    }
    
    testLocation() {
        console.log('🧪 Testing with dummy location data...');
        if (this.map) {
            const testPos = {
                coords: {
                    latitude: 23.8103 + (Math.random() - 0.5) * 0.01,
                    longitude: 90.4125 + (Math.random() - 0.5) * 0.01,
                    accuracy: Math.random() * 20 + 5,
                    speed: Math.random() * 10
                }
            };
            this.handleLocationUpdate(testPos);
            console.log('✅ Test location data applied');
        } else {
            console.error('❌ Map not initialized');
        }
    }
    
    debugMap() {
        console.log('🔍 Map Debug Information:');
        console.log('Map object:', this.map);
        console.log('Map container:', document.getElementById('map'));
        if (this.map) {
            console.log('Map center:', this.map.getCenter());
            console.log('Map zoom:', this.map.getZoom());
            console.log('Map size:', this.map.getSize());
        }
    }
    
    forceMapResize() {
        console.log('🔄 Forcing map resize...');
        if (this.map) {
            this.map.invalidateSize();
            console.log('✅ Map resized');
        } else {
            console.error('❌ Map not initialized');
        }
    }

    // Log feature usage to server
    logFeatureUsage(feature) {
        if (this.socket) {
            this.socket.emit('feature-used', { feature });
            console.log(`🎛️ Feature logged: ${feature}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.tracker = new LightningTracker();
});

window.testLocation = function() {
    console.log('🧪 Testing with dummy location data...');
    if (window.tracker) {
        const testPos = {
            coords: {
                latitude: 23.8103 + (Math.random() - 0.5) * 0.01,
                longitude: 90.4125 + (Math.random() - 0.5) * 0.01,
                accuracy: 10,
                speed: 5
            }
        };
        window.tracker.handleLocationUpdate(testPos);
        console.log('✅ Test location data applied');
    } else {
        console.error('❌ Tracker not found');
    }
};

// Add debug functions
window.debugMap = function() {
    console.log('🔍 Map Debug Info:');
    if (window.tracker && window.tracker.map) {
        console.log('Map object:', window.tracker.map);
        console.log('Map container:', document.getElementById('map'));
        console.log('Map center:', window.tracker.map.getCenter());
        console.log('Map zoom:', window.tracker.map.getZoom());
    } else {
        console.error('❌ Map not found');
    }
};

window.forceMapResize = function() {
    console.log('🔄 Forcing map resize...');
    if (window.tracker && window.tracker.map) {
        window.tracker.map.invalidateSize();
        console.log('✅ Map resized');
    }
};
