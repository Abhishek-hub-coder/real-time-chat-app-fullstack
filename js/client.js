const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

const API_URL = isLocalHost
    ? "http://localhost:8400"
    : window.location.origin;

let socket;

const authContainer = document.getElementById('auth-container');
const authMessage = document.getElementById('authMessage');
const authTabs = document.querySelectorAll('.auth-tab');
const loginPanel = document.getElementById('loginPanel');
const registerPanel = document.getElementById('registerPanel');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUser = document.getElementById('currentUser');

const appContainer = document.querySelector('.app');
const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector(".container");
const usersDiv = document.getElementById('users-list');
const userSearchInput = document.getElementById('userSearchInput');
const typingDiv = document.getElementById('typing');
const chatHeader = document.getElementById('chat-header');

let name = "";
let selectedUserId = null;
let allowedPrivateUsers = new Set();
let onlineUsers = {};
const pendingSeenMessages = {};
const chats = {};

const audio = new Audio('ting.mp3');

localStorage.removeItem('ichatToken');
localStorage.removeItem('ichatUsername');

function playIncomingSound() {
    if (!name || !socket || !socket.connected) return;
    if (appContainer.style.display === 'none') return;

    audio.currentTime = 0;
    audio.play().catch(() => { });
}

function isPageActive() {
    return document.visibilityState === 'visible' && document.hasFocus();
}

function queueSeenMessage(userId, messageId) {
    if (!messageId) return;

    if (!pendingSeenMessages[userId]) {
        pendingSeenMessages[userId] = new Set();
    }

    pendingSeenMessages[userId].add(messageId);
}

function markMessageSeen(userId, messageId) {
    if (!socket || !socket.connected || !messageId) return;

    socket.emit('private-message-seen', {
        to: userId,
        messageId
    });
}

function markSelectedChatSeen() {
    if (!selectedUserId || !allowedPrivateUsers.has(selectedUserId) || !isPageActive()) {
        return;
    }

    const pendingMessages = pendingSeenMessages[selectedUserId];

    if (pendingMessages) {
        pendingMessages.forEach(messageId => {
            markMessageSeen(selectedUserId, messageId);
        });

        pendingMessages.clear();
    }

    socket.emit('private-messages-seen', { to: selectedUserId });
}

function resetLiveConnectionState(message = "Select a user to start chatting") {
    selectedUserId = null;
    allowedPrivateUsers = new Set();
    onlineUsers = {};
    usersDiv.innerHTML = "";
    typingDiv.innerText = "";
    messageContainer.innerHTML = "";
    chatHeader.innerText = message;
}

function showAuth(message = "") {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    authMessage.innerText = message;
}

function showAuthPanel(panelName) {
    authMessage.innerText = "";

    authTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.authTab === panelName);
    });

    loginPanel.classList.toggle('active', panelName === 'login');
    registerPanel.classList.toggle('active', panelName === 'register');
}

function showApp(username) {
    name = username;
    currentUser.innerText = username;
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
}

async function authRequest(path, username, password) {
    const response = await fetch(`${API_URL}/api/auth/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Authentication failed.');
    }

    return data;
}

async function handleAuth(path, usernameInput, passwordInput) {
    try {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            authMessage.innerText = "Please enter username and password.";
            return;
        }

        const data = await authRequest(path, username, password);

        sessionStorage.setItem('ichatToken', data.token);
        sessionStorage.setItem('ichatUsername', data.username);

        usernameInput.value = '';
        passwordInput.value = '';
        connectSocket(data.token, data.username);
    } catch (error) {
        authMessage.innerText = error.message;
    }
}

function connectSocket(token, username) {
    if (socket) {
        socket.disconnect();
    }

    showApp(username);

    socket = io(API_URL, {
        auth: { token }
    });

    socket.on('connect', () => {
        resetLiveConnectionState();
    });

    socket.on('disconnect', () => {
        resetLiveConnectionState("Reconnecting...");
    });

    socket.on('connect_error', () => {
        sessionStorage.removeItem('ichatToken');
        sessionStorage.removeItem('ichatUsername');
        resetLiveConnectionState();
        showAuth("Session expired. Please login again.");
    });

    socket.on('user-joined', () => {
        // Online users are shown in the sidebar via update-users.
    });

    socket.on('receive', data => {
        append(data.name + ": " + data.message, 'left');
    });

    socket.on('receive-private', data => {
        const isCurrentChat = data.fromId === selectedUserId;

        append("(Private) " + data.name + ": " + data.message, 'left', data.fromId, {
            messageId: data.messageId,
            render: isCurrentChat,
            playSound: isCurrentChat
        });

        if (isCurrentChat && isPageActive()) {
            markMessageSeen(data.fromId, data.messageId);
        } else {
            queueSeenMessage(data.fromId, data.messageId);
        }
    });

    socket.on('private-request', (data) => {
        const div = document.createElement('div');
        div.classList.add('message', 'left');

        div.innerHTML = `
            ${data.fromName} wants private chat<br>
            <button class="acceptBtn">Accept</button>
            <button class="rejectBtn">Reject</button>
        `;

        messageContainer.append(div);

        div.querySelector('.acceptBtn').onclick = () => {
            socket.emit('accept-private-chat', { fromId: data.fromId });
            div.innerHTML = "Private chat accepted";
        };

        div.querySelector('.rejectBtn').onclick = () => {
            div.innerHTML = "Private chat rejected";
            selectedUserId = null;
        };
    });

    socket.on('private-chat-accepted', (data) => {
        allowedPrivateUsers.add(data.with);
        selectedUserId = data.with;

        append("Private chat started", 'right');
    });

    socket.on('private-message-status', (data) => {
        updateMessageStatus(data.messageId, data.status);
    });

    socket.on('private-history', (data) => {
        chats[data.with] = data.messages.map(savedMessage => {
            return createMessageHTML(
                formatHistoryMessage(savedMessage),
                savedMessage.ownMessage ? 'right' : 'left',
                {
                    messageId: savedMessage.messageId,
                    ownMessage: savedMessage.ownMessage,
                    status: savedMessage.ownMessage ? savedMessage.status : null
                }
            ).outerHTML;
        });

        if (selectedUserId === data.with) {
            messageContainer.innerHTML = chats[data.with].join("");
            messageContainer.scrollTop = messageContainer.scrollHeight;
            markSelectedChatSeen();
        }
    });

    socket.on('private-messages-seen', (data) => {
        updateChatStatuses(data.by, 'seen');
    });

    socket.on('update-users', (users) => {
        onlineUsers = users || {};
        renderUsers();
    });

    socket.on('show-typing', (data) => {
        if (data.fromId !== selectedUserId) return;

        typingDiv.innerText = data.name + " is typing...";

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            typingDiv.innerText = "";
        }, 5000);
    });

    socket.on('left', () => {
        // Online users are shown in the sidebar via update-users.
    });
}

function createMessageHTML(message, position, options = {}) {
    const div = document.createElement('div');

    const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    div.classList.add('message', position);

    if (options.messageId) {
        div.dataset.messageId = options.messageId;
    }

    if (options.ownMessage) {
        div.dataset.ownMessage = 'true';
    }

    const text = document.createElement('span');
    text.innerText = message + " (" + time + ")";
    div.appendChild(text);

    if (options.status) {
        const status = document.createElement('span');
        status.classList.add('message-status');
        status.innerText = options.status;
        div.appendChild(status);
    }

    return div;
}

function formatHistoryMessage(savedMessage) {
    if (savedMessage.ownMessage) {
        return "(Private) You: " + savedMessage.message;
    }

    return "(Private) " + savedMessage.name + ": " + savedMessage.message;
}

function append(message, position, userId = null, options = {}) {
    const div = createMessageHTML(message, position, options);

    if (userId) {
        if (!chats[userId]) chats[userId] = [];
        chats[userId].push(div.outerHTML);
    }

    if (options.render === false) {
        return;
    }

    messageContainer.append(div);
    messageContainer.scrollTop = messageContainer.scrollHeight;

    if (position === 'left' && options.playSound !== false) {
        playIncomingSound();
    }
}

function updateStoredMessageStatus(messageId, status) {
    Object.keys(chats).forEach(userId => {
        chats[userId] = chats[userId].map(messageHTML => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = messageHTML;
            const messageElement = wrapper.firstElementChild;

            if (!messageElement || messageElement.dataset.messageId !== messageId) {
                return messageHTML;
            }

            const statusElement = messageElement.querySelector('.message-status');

            if (statusElement) {
                statusElement.innerText = status;
            }

            return messageElement.outerHTML;
        });
    });
}

function updateMessageStatus(messageId, status) {
    const messageElement = Array.from(document.querySelectorAll('[data-message-id]'))
        .find(element => element.dataset.messageId === messageId);

    if (messageElement) {
        const statusElement = messageElement.querySelector('.message-status');

        if (statusElement) {
            statusElement.innerText = status;
        }
    }

    updateStoredMessageStatus(messageId, status);
}

function updateChatStatuses(userId, status) {
    if (!chats[userId]) return;

    chats[userId] = chats[userId].map(messageHTML => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = messageHTML;
        const messageElement = wrapper.firstElementChild;

        if (!messageElement || messageElement.dataset.ownMessage !== 'true') {
            return messageHTML;
        }

        const statusElement = messageElement.querySelector('.message-status');

        if (statusElement) {
            statusElement.innerText = status;
        }

        return messageElement.outerHTML;
    });

    if (selectedUserId === userId) {
        messageContainer.innerHTML = chats[userId].join("");
    }
}

function selectUser(id, userName, element) {
    selectedUserId = id;
    typingDiv.innerText = "";
    chatHeader.innerText = "Chatting with: " + userName;

    document.querySelectorAll('#users-list div').forEach(div => {
        div.classList.remove('selected-user');
    });

    element.classList.add('selected-user');
    messageContainer.innerHTML = chats[id]?.join("") || "";

    socket.emit('start-private-chat', { to: id });

    markSelectedChatSeen();
}

function renderUsers() {
    const searchText = userSearchInput.value.trim().toLowerCase();

    usersDiv.innerHTML = "";

    Object.entries(onlineUsers).forEach(([id, user]) => {
        const userName = typeof user === 'string' ? user : user.username;

        if (id === socket.id) return;
        if (!userName) return;
        if (userName === name) return;
        if (!userName.toLowerCase().includes(searchText)) return;

        const div = document.createElement('div');
        div.innerText = userName;

        if (id === selectedUserId) {
            div.classList.add('selected-user');
        }

        div.onclick = () => selectUser(id, userName, div);

        usersDiv.appendChild(div);
    });
}

authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        showAuthPanel(tab.dataset.authTab);
    });
});

loginBtn.addEventListener('click', () => {
    handleAuth('login', loginUsername, loginPassword);
});

registerBtn.addEventListener('click', () => {
    handleAuth('signup', registerUsername, registerPassword);
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('ichatToken');
    sessionStorage.removeItem('ichatUsername');

    if (socket) {
        socket.disconnect();
    }

    resetLiveConnectionState();
    showAuth();
});

form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!name || !socket) return;

    const message = messageInput.value.trim();

    if (!message) return;

    if (selectedUserId) {
        if (!allowedPrivateUsers.has(selectedUserId)) {
            append("Private chat not accepted yet", 'right');
            messageInput.value = '';
            return;
        }

        const messageId = `${socket.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        append("(Private) You: " + message, 'right', selectedUserId, {
            messageId,
            status: 'sent',
            ownMessage: true
        });

        socket.emit('private-message', {
            message,
            to: selectedUserId,
            messageId
        });
    } else {
        append("You: " + message, 'right');
        socket.emit('send', message);
    }

    messageInput.value = '';
});

userSearchInput.addEventListener('input', renderUsers);

window.addEventListener('focus', markSelectedChatSeen);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        markSelectedChatSeen();
    }
});

let typingTimeout;

messageInput.addEventListener('input', () => {
    if (selectedUserId && allowedPrivateUsers.has(selectedUserId)) {
        socket.emit('typing', { to: selectedUserId });
    }
});

const savedToken = sessionStorage.getItem('ichatToken');
const savedUsername = sessionStorage.getItem('ichatUsername');

if (savedToken && savedUsername) {
    connectSocket(savedToken, savedUsername);
} else {
    showAuth();
}
