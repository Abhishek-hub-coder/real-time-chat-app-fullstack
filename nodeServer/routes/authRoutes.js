const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ichat_dev_secret_change_me';

function createToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            username: user.username
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

router.post('/signup', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        const passwordRegex = /^(?=.*[^a-zA-Z0-9]).{5,10}$/;

        if (username.length < 3) {
            return res.status(400).json({
                message: 'Username must be at least 3 characters.'
            });
        }

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must be 5 to 10 characters and include at least one special character.'
            });
        }

        const usernameLower = username.toLowerCase();
        const userExists = await User.findOne({ usernameLower });

        if (userExists) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            usernameLower,
            passwordHash
        });

        res.status(201).json({
            message: 'Account created successfully.',
            token: createToken(user),
            username: user.username
        });
    } catch (error) {
        res.status(500).json({ message: 'Signup failed.' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');

        const user = await User.findOne({
            usernameLower: username.toLowerCase()
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        res.json({
            message: 'Login successful.',
            token: createToken(user),
            username: user.username
        });
    } catch (error) {
        res.status(500).json({ message: 'Login failed.' });
    }
});

module.exports = router;
