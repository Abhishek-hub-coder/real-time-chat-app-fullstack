const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');

app.use(cors());

// Root route (important for deployment check)
app.get("/", (req, res) => {
    res.send("Chat server is running 🚀");
});

const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const users = {};

io.on('connection', (socket) => {

    console.log("New user connected:", socket.id);

    // New user joins
    socket.on('new-user-joined', (name) => {
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
    });

    // Send message
    socket.on('send', (message) => {
        const userName = users[socket.id];
        if (userName) {
            socket.broadcast.emit('receive', {
                message,
                name: userName
            });
        }
    });

    // User disconnect
    socket.on('disconnect', () => {
        const userName = users[socket.id];
        if (userName) {
            socket.broadcast.emit('left', userName);
            delete users[socket.id];
        }
        console.log("User disconnected:", socket.id);
    });
});

// IMPORTANT: dynamic port for deployment
const PORT = process.env.PORT || 8400;

http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});