## iChat - Real-Time Full-Stack Chat App

Live Demo: https://real-time-chat-app-fullstack-1.onrender.com/

iChat is a full-stack real-time chat application built with **HTML, CSS, JavaScript, Node.js, Express.js, Socket.IO, MongoDB Atlas, JWT authentication, and bcrypt password hashing**.

The application supports authenticated users, online user tracking, private chat requests, one-to-one messaging, typing indicators, sent/delivered/seen message status, and persistent private chat history.

## Features

- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- MongoDB Atlas database integration
- Real-time communication using Socket.IO
- Online users list
- Search online users
- Private chat request and accept flow
- One-to-one private messaging
- Typing indicator for selected private chat
- Sent, delivered, and seen message status
- Persistent private message history
- Join and leave notifications
- Logout and session handling
- Full-stack deployment on Render

## Live Application

```text
https://real-time-chat-app-fullstack-1.onrender.com/

Tech Stack
Frontend
HTML
CSS
JavaScript
Backend
Node.js
Express.js
Socket.IO
JWT
bcryptjs
Database
MongoDB Atlas
Mongoose
Deployment
Render
GitHub
Project Structure
i-chat-App-main
├── css
│   └── style.css
├── js
│   └── client.js
├── nodeServer
│   ├── config
│   │   └── db.js
│   ├── models
│   │   ├── Message.js
│   │   └── User.js
│   ├── routes
│   │   └── authRoutes.js
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
├── chat.png
├── index.html
├── ting.mp3
└── README.md
How The Application Works
1. User Authentication
The application starts with a login and registration page.

When a new user registers, the backend receives the username and password through the signup API.

The password is not stored directly. It is hashed using bcryptjs before being saved in MongoDB.

After successful registration or login, the backend creates a JWT token and sends it to the frontend.

The frontend stores this token in sessionStorage.

This token is later used to authenticate the Socket.IO connection.

2. MongoDB User Storage
User details are stored in MongoDB Atlas.

Each user document contains:

{
  username,
  usernameLower,
  passwordHash
}
usernameLower is used to prevent duplicate usernames with different letter casing.

Example:

Abhishek
abhishek
ABHISHEK
These are treated as the same username.

3. Socket.IO Authentication
Socket.IO connections are protected using JWT.

When the frontend connects to the Socket.IO server, it sends the token:

socket = io(API_URL, {
    auth: { token }
});
The backend verifies the token before allowing the socket connection.

If the token is missing or invalid, the connection is rejected.

4. Online Users
When a user connects successfully, the backend stores the active socket id and username in memory.

The server then broadcasts the updated online users list to all connected users.

The frontend displays all online users in the sidebar.

The current logged-in user is not shown in their own online users list.

5. User Search
The sidebar contains a search input.

Users can search online users by typing part of their username.

The filtering is done on the frontend using the current online users list.

6. Private Chat Request Flow
To start a private chat, a user clicks another online user from the sidebar.

This emits a start-private-chat event to the backend.

The backend sends a private chat request to the selected user.

The selected user can either accept or reject the request.

Only after the private chat is accepted can private messages be sent between those two users.

7. Real-Time Private Messaging
After a private chat is accepted, users can exchange messages instantly.

Private messages are sent through Socket.IO using the private-message event.

The receiver gets the message through the receive-private event.

Messages appear in real time without refreshing the page.

8. Persistent Message History
Private messages are stored in MongoDB Atlas.

Each message document contains:

{
  messageId,
  conversationId,
  senderId,
  receiverId,
  senderName,
  text,
  status
}
The conversationId is generated using both users’ MongoDB ids.

Both user ids are sorted before creating the conversation id, so both users always share the same conversation.

When a user selects another user, the backend fetches the latest previous messages from MongoDB and sends them to the frontend.

This allows old private messages to appear again after refresh or re-login.

9. Message Status
Private messages support three statuses:

sent
delivered
seen
When the sender sends a message, it first appears as:

sent
When the backend forwards it to the receiver, the status becomes:

delivered
When the receiver opens or focuses the selected chat, the status becomes:

seen
The message status is also updated in MongoDB.

10. Typing Indicator
Typing indicators work only for the selected private chat.

When a user types in the message input, the frontend emits a typing event.

The backend sends this event only to the selected private chat user.

The receiver sees:

username is typing...
The typing message disappears automatically after a few seconds.

11. Join and Leave Notifications
When a user joins or leaves, other users see a temporary notification.

These notifications are shown separately from the chat messages.

They are not stored in message history.

12. Logout and Session Handling
When a user logs out:

JWT token is removed from sessionStorage
Socket connection is disconnected
Online user state is cleared
User is returned to the login page
The app uses sessionStorage instead of localStorage, so different browser tabs can login as different users during testing.

API Routes
Register User
POST /api/auth/signup
Request body:

{
  "username": "abhishek",
  "password": "abc@1"
}
Password rules:

5 to 10 characters
must include at least one special character
Login User
POST /api/auth/login
Request body:

{
  "username": "abhishek",
  "password": "abc@1"
}

Important Socket.IO Events
Event	Description
update-users	Updates online users list
start-private-chat	Sends private chat request
accept-private-chat	Accepts private chat request
private-message	Sends private message
receive-private	Receives private message
private-history	Loads previous private messages
typing	Sends typing status
show-typing	Displays typing indicator
private-message-status	Updates sent/delivered/seen status
private-message-seen	Marks one message as seen
private-messages-seen	Marks selected chat messages as seen
user-joined	Shows user joined notification
left	Shows user left notification
Local Setup
Clone the repository:

git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
Install backend dependencies:

cd nodeServer
npm install
Create a .env file inside the nodeServer folder:

MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
Start the server:

npm start
The app runs locally at:

http://localhost:8400
Environment Variables
Variable	Description
MONGO_URI	MongoDB Atlas connection string
JWT_SECRET	Secret key used to sign JWT tokens
Do not commit the .env file to GitHub.

Deployment
The app is deployed as a single full-stack Render Web Service.

Render settings:

Root Directory: nodeServer
Build Command: npm install
Start Command: npm start
Required environment variables in Render:

MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
MongoDB Atlas Network Access should allow the deployed server to connect.

For testing, Atlas can allow:

0.0.0.0/0
What I Learned
Through this project, I learned how to:

Build a real-time application using Socket.IO
Implement JWT authentication
Hash passwords securely with bcrypt
Store users and messages in MongoDB Atlas
Manage online users using socket ids
Build private one-to-one chat flow
Track message status in real time
Persist chat history after refresh
Deploy a full-stack app on Render
Resume Highlight
Built and deployed an authenticated real-time private chat application using Node.js, Express.js, Socket.IO, MongoDB Atlas, JWT authentication, bcrypt password hashing, online user tracking, private messaging, typing indicators, sent/delivered/seen message status, and persistent chat history.

Future Improvements
Group chat rooms
Image and file sharing
User profile pictures
Unread message count
Browser notifications
Redis adapter for Socket.IO scaling
Better mobile UI
Admin dashboard
Screenshots
Add your screenshots below.

Login and Registration Page
Add screenshot here.

Online Users Dashboard
Add screenshot here.

Private Chat Request
Add screenshot here.

Real-Time Private Chat
Add screenshot here.

Typing Indicator
Add screenshot here.

Sent, Delivered, and Seen Status
Add screenshot here.

Persistent Chat History
Add screenshot here.

MongoDB Atlas Users Collection
Add screenshot here.

MongoDB Atlas Messages Collection
Add screenshot here.

Author
Abhishek Sharma

## Screenshots

<h2 align="center">Login and Registration Page</h2>

<p align="center">
  <img src="https://github.com/user-attachments/assets/e4e3bd9b-8727-48c7-9fff-8ac2ae32de61" width="800">
</p>



**Online Users Dashboard**

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/766d77dc-a41f-4714-9b4b-619c00095ffc" />


**Private Chat Request**
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/8b1185e6-9867-4103-a6dd-263a21037665" />

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/8378fbda-4a2c-4b75-893a-19bf1f63acab" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/bb068399-d4f7-417e-bff4-b83ab71c894e" />


**Real-Time Private Chat**
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/1f80fb73-2b0c-4d22-87e1-abc078b6a668" />


**Typing Indicator**
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/823759a6-b9a9-4bdc-877e-816eed6f71dd" />

**Sent, Delivered, and Seen Message Status**

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/59be98aa-85b8-4929-8301-024b28a8e496" />

**Persistent Chat History After Refresh**
click win + f5 and after select user and the pas chat between them will appear
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/96e630b8-bfeb-4e3a-be00-752afd17ce50" />


**MongoDB Atlas Users Collection**
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/31040af1-2501-4aba-86d9-f81296b43bdb" />

**MongoDB Atlas Messages Collection**
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/10363833-2fef-4ff6-b270-50a992c1b567" />

**Deployed Render Application**
![Uploading image.png…]()
