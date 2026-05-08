const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        messageId: {
            type: String,
            required: true,
            unique: true
        },
        conversationId: {
            type: String,
            required: true,
            index: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        senderName: {
            type: String,
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['sent', 'delivered', 'seen'],
            default: 'sent'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Message', messageSchema);
