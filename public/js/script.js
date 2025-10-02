// Simple Real-time Device Tracking System
class SimpleTracker {
    constructor() {
        this.socket = io();
        this.map = null;
        this.marker = null;
        this.isTracking = false;
        this.watchId = null;
        this.updateCount = 0;
        
        this.initMap();
        this.setupEvents();
    }

    initMap() {
        this.map = L.map('map').setView([23.8103, 90.4125], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        console.log('Map initialized');
    }

    startTracking() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by this browser.');
            return;
        }

        if (this.isTracking) {
            this.stopTracking();
            return;
        }

        this.isTracking = true;
        this.updateButton();

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.updateCount++;
                const { latitude, longitude } = position.coords;
                
                this.updateMap(latitude, longitude);
                this.updateDisplay(latitude, longitude);
                
                this.socket.emit('locationUpdate', {
                    latitude,
                    longitude,
                    timestamp: Date.now()
                });

                console.log('Location updated: ' + latitude + ', ' + longitude);
            },
            (error) => {
                console.error('Location error:', error.message);
                alert('Error getting location: ' + error.message);
            },
            options
        );
    }

    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        this.isTracking = false;
        this.updateButton();
        console.log('Tracking stopped');
    }

    updateMap(latitude, longitude) {
        const newLatLng = [latitude, longitude];
        
        if (this.marker) {
            this.marker.setLatLng(newLatLng);
        } else {
            this.marker = L.marker(newLatLng).addTo(this.map);
        }

        this.map.setView(newLatLng, 15);
    }

    updateDisplay(latitude, longitude) {
        const coordsElement = document.querySelector('.coordinates');
        if (coordsElement) {
            coordsElement.innerHTML = '<div>Latitude: ' + latitude.toFixed(6) + '</div><div>Longitude: ' + longitude.toFixed(6) + '</div><div>Updates: ' + this.updateCount + '</div>';
        }

        const statusElement = document.querySelector('.status-text');
        if (statusElement) {
            statusElement.textContent = this.isTracking ? 'TRACKING ACTIVE' : 'READY';
        }
    }

    updateButton() {
        const trackBtn = document.querySelector('.track-btn');
        if (trackBtn) {
            if (this.isTracking) {
                trackBtn.innerHTML = '<i class="fas fa-stop"></i> STOP TRACKING';
                trackBtn.style.background = '#ff3366';
            } else {
                trackBtn.innerHTML = '<i class="fas fa-play"></i> START TRACKING';
                trackBtn.style.background = '#00ff88';
            }
        }
    }

    setupEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            const statusElement = document.querySelector('.status-text');
            if (statusElement) statusElement.textContent = 'CONNECTED';
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            const statusElement = document.querySelector('.status-text');
            if (statusElement) statusElement.textContent = 'DISCONNECTED';
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.track-btn')) {
                this.startTracking();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.tracker = new SimpleTracker();
});
