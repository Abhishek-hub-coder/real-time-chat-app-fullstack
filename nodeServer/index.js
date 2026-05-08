require('dotenv').config();

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const Message = require('./models/Message');

const JWT_SECRET = process.env.JWT_SECRET || 'ichat_dev_secret_change_me';

app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
app.use(express.static(path.join(__dirname, '..')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const users = {};
const userSockets = {};
const privateRooms = {};

function getConversationId(firstUserId, secondUserId) {
    return [firstUserId, secondUserId].sort().join('-');
}

function getOnlineUsers() {
    const onlineUsers = {};

    Object.entries(users).forEach(([socketId, user]) => {
        if (io.sockets.sockets.has(socketId)) {
            onlineUsers[socketId] = user;
        } else {
            delete users[socketId];

            if (userSockets[user.userId] === socketId) {
                delete userSockets[user.userId];
            }
        }
    });

    return onlineUsers;
}

function emitOnlineUsers() {
    io.emit('update-users', getOnlineUsers());
}

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        socket.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {

    console.log("User connected:", socket.id);

    const existingSocketId = userSockets[socket.user.id];

    if (existingSocketId && existingSocketId !== socket.id) {
        delete users[existingSocketId];
        io.sockets.sockets.get(existingSocketId)?.disconnect(true);
    }

    users[socket.id] = {
        userId: socket.user.id,
        username: socket.user.username
    };
    userSockets[socket.user.id] = socket.id;
    socket.broadcast.emit('user-joined', socket.user.username);
    emitOnlineUsers();

    socket.on('new-user-joined', () => {
        emitOnlineUsers();
    });

    // PUBLIC MESSAGE
    socket.on('send', (message) => {
        socket.broadcast.emit('receive', {
            message,
            name: users[socket.id]?.username
        });
    });

    // PRIVATE REQUEST
    socket.on('start-private-chat', async ({ to }) => {
        const currentUser = users[socket.id];
        const targetUser = getOnlineUsers()[to];

        if (!currentUser || !targetUser) return;

        socket.to(to).emit('private-request', {
            fromId: socket.id,
            fromName: currentUser.username
        });

        const conversationId = getConversationId(currentUser.userId, targetUser.userId);
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .limit(100)
            .lean();

        io.to(socket.id).emit('private-history', {
            with: to,
            messages: messages.map(savedMessage => ({
                messageId: savedMessage.messageId,
                message: savedMessage.text,
                name: savedMessage.senderName,
                fromId: userSockets[String(savedMessage.senderId)] || null,
                senderUserId: String(savedMessage.senderId),
                receiverUserId: String(savedMessage.receiverId),
                status: savedMessage.status,
                ownMessage: String(savedMessage.senderId) === currentUser.userId
            }))
        });
    });

    // ACCEPT PRIVATE CHAT
    socket.on('accept-private-chat', ({ fromId }) => {
        const roomId = [socket.id, fromId].sort().join('-');
        privateRooms[roomId] = true;

        io.to(socket.id).emit('private-chat-accepted', { with: fromId });
        io.to(fromId).emit('private-chat-accepted', { with: socket.id });
    });

    // PRIVATE MESSAGE
    socket.on('private-message', async ({ message, to, messageId }) => {
        const roomId = [socket.id, to].sort().join('-');

        if (!privateRooms[roomId]) return;

        const sender = users[socket.id];
        const receiver = getOnlineUsers()[to];

        if (!sender || !receiver) return;

        const conversationId = getConversationId(sender.userId, receiver.userId);

        await Message.create({
            messageId,
            conversationId,
            senderId: sender.userId,
            receiverId: receiver.userId,
            senderName: sender.username,
            text: message,
            status: 'delivered'
        });

        socket.to(to).emit('receive-private', {
            message,
            name: sender.username,
            fromId: socket.id,
            messageId
        });

        io.to(socket.id).emit('private-message-status', {
            messageId,
            status: 'delivered'
        });
    });

    socket.on('private-message-seen', ({ to, messageId }) => {
        const roomId = [socket.id, to].sort().join('-');

        if (!privateRooms[roomId]) return;

        Message.updateOne(
            { messageId },
            { $set: { status: 'seen' } }
        ).catch(error => console.error('Seen update failed:', error.message));

        io.to(to).emit('private-message-status', {
            messageId,
            status: 'seen'
        });
    });

    socket.on('private-messages-seen', ({ to }) => {
        const roomId = [socket.id, to].sort().join('-');

        if (!privateRooms[roomId]) return;

        const viewer = users[socket.id];
        const sender = getOnlineUsers()[to];

        if (viewer && sender) {
            const conversationId = getConversationId(viewer.userId, sender.userId);

            Message.updateMany(
                {
                    conversationId,
                    senderId: sender.userId,
                    receiverId: viewer.userId,
                    status: { $ne: 'seen' }
                },
                { $set: { status: 'seen' } }
            ).catch(error => console.error('Bulk seen update failed:', error.message));
        }

        io.to(to).emit('private-messages-seen', {
            by: socket.id
        });
    });

    // TYPING
    socket.on('typing', ({ to }) => {
        const roomId = [socket.id, to].sort().join('-');

        if (!privateRooms[roomId]) return;

        socket.to(to).emit('show-typing', {
            fromId: socket.id,
            name: users[socket.id]?.username
        });
    });

    socket.on('disconnect', () => {
        const disconnectedUser = users[socket.id];
        const name = disconnectedUser?.username;

        if (disconnectedUser) {
            socket.broadcast.emit('left', name);

            if (userSockets[disconnectedUser.userId] === socket.id) {
                delete userSockets[disconnectedUser.userId];
            }
        }

        delete users[socket.id];

        emitOnlineUsers();
    });
});

const PORT = process.env.PORT || 8400;

connectDB()
    .then(() => {
        http.listen(PORT, () => {
            console.log("Server running on port " + PORT);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });
