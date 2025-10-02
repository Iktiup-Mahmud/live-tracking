import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";

const app = express();
const port = 3000;

const server = createServer(app);
const io = new Server(server);

// Set view engine
app.set("view engine", "ejs");

// Serve static files from public directory
app.use(express.static(path.join(path.resolve(), "public")));



app.get("/", (req, res) => 
    // res.send("Hello World!")
    res.render("index")
);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // Handle location updates
    socket.on('location-update', (locationData) => {
        console.log('Location update received:', locationData);
        
        // Broadcast location to all connected clients
        socket.broadcast.emit('user-location-update', {
            socketId: socket.id,
            ...locationData
        });
        
        // Send acknowledgment back to sender
        socket.emit('location-received', { status: 'success', timestamp: new Date() });
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


