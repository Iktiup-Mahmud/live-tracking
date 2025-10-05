const { Server } = require("socket.io");

let io;

module.exports = (req, res) => {
    if (!res.socket.server.io) {
        console.log('Setting up Socket.io');
        
        io = new Server(res.socket.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            transports: ['polling', 'websocket'],
            allowEIO3: true
        });

        // Store connected users
        const connectedUsers = new Map();

        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);
            
            // Initialize user data
            connectedUsers.set(socket.id, {
                id: socket.id,
                joinedAt: new Date(),
                isTracking: false,
                lastLocation: null
            });

            // Handle start tracking
            socket.on('startTracking', () => {
                console.log('🎛️ Feature used: startTracking by', socket.id);
                
                const user = connectedUsers.get(socket.id);
                if (user) {
                    user.isTracking = true;
                    connectedUsers.set(socket.id, user);
                }
            });

            // Handle stop tracking
            socket.on('stopTracking', () => {
                console.log('🎛️ Feature used: stopTracking by', socket.id);
                
                const user = connectedUsers.get(socket.id);
                if (user) {
                    user.isTracking = false;
                    connectedUsers.set(socket.id, user);
                }
            });

            // Handle location updates
            socket.on('locationUpdate', async (location) => {
                console.log('Location update received:', location);
                
                // Update user's last location
                const user = connectedUsers.get(socket.id);
                if (user) {
                    user.lastLocation = location;
                    connectedUsers.set(socket.id, user);
                }

                // Mock environmental data for now
                const fallbackData = {
                    temperature: Math.round(15 + Math.random() * 20),
                    humidity: Math.round(40 + Math.random() * 40),
                    pressure: Math.round(1000 + Math.random() * 50),
                    windSpeed: Math.round(Math.random() * 25),
                    visibility: Math.round(5 + Math.random() * 15),
                    uvIndex: Math.round(Math.random() * 11)
                };
                
                // Broadcast the location and environmental data to all clients
                io.emit('locationUpdate', {
                    ...location,
                    socketId: socket.id,
                    environmental: fallbackData
                });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
                connectedUsers.delete(socket.id);
            });
        });

        res.socket.server.io = io;
    }

    res.end();
};