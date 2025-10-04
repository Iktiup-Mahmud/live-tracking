// Lightning Tracker - Enhanced Version with Debugging
class LightningTracker {
    constructor() {
        console.log('🚀 Lightning Tracker initializing...');
        
        // Initialize properties
        this.socket = null;
        this.map = null;
        this.marker = null;
        this.isTracking = false;
        this.watchId = null;
        this.updateCount = 0;
        
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
            
            // Add tile layer with comprehensive error handling
            const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            });
            
            // Tile loading events
            tileLayer.on('loading', () => {
                console.log('🔄 Map tiles loading...');
            });
            
            tileLayer.on('load', () => {
                console.log('✅ Map tiles loaded successfully');
            });
            
            tileLayer.on('tileerror', (e) => {
                console.error('❌ Tile loading error:', e);
            });
            
            // Add tile layer to map
            tileLayer.addTo(this.map);
            
            // Force map to recognize its container size
            setTimeout(() => {
                this.map.invalidateSize();
                console.log('🔄 Map size invalidated and refreshed');
            }, 100);
            
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
                        <h4>🎯 Lightning Tracker</h4>
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
        }
        
        console.log('✅ Event listeners setup completed');
    }

    startTracking() {
        if (!navigator.geolocation) {
            alert('Geolocation not supported');
            return;
        }

        this.isTracking = true;
        this.updateStatus('TRACKING...');
        
        const options = {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 10000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handleLocationUpdate(position),
            (error) => this.handleLocationError(error),
            options
        );

        const btn = document.querySelector('.track-btn');
        if (btn) btn.innerHTML = '<i class="fas fa-stop"></i> STOP TRACKING';
    }

    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        this.isTracking = false;
        this.updateStatus('READY');
        
        const btn = document.querySelector('.track-btn');
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> START TRACKING';
    }

    handleLocationUpdate(position) {
        console.log('Location update:', position.coords);
        
        const { latitude, longitude, accuracy, speed } = position.coords;
        
        this.updateMap(latitude, longitude);
        this.updateDisplay(latitude, longitude, accuracy, speed);
        this.updateCount++;
        
        this.socket.emit('locationUpdate', {
            latitude,
            longitude,
            accuracy,
            speed,
            timestamp: Date.now()
        });
    }

    handleLocationError(error) {
        console.error('Location error:', error);
        this.updateStatus('GPS ERROR');
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

    updateDisplay(lat, lng, accuracy, speed) {
        this.updateElement('#lat-value', lat.toFixed(8));
        this.updateElement('#lng-value', lng.toFixed(8));
        this.updateElement('#accuracy', accuracy ? accuracy.toFixed(0) + 'm' : '--');
        this.updateElement('#speed-value', speed ? (speed * 3.6).toFixed(1) + ' km/h' : '--');
        this.updateElement('#updates-count', this.updateCount);
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
            { name: 'HTTPS/Localhost', check: () => location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1', result: null }
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
        
        if (allPassed) {
            console.log('🎉 All diagnostics passed! System is fully operational.');
            this.addDebugFunctions();
        } else {
            console.error('🚨 Some diagnostics failed. Check the issues above.');
            const failedTests = diagnostics.filter(t => !t.result).map(t => t.name);
            console.error('❌ Failed tests:', failedTests.join(', '));
        }
        
        return allPassed;
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
