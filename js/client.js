// this is connected by script
const socket = io(
    window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
        ? "http://localhost:8400"
        : "https://chat-app-jc8j.onrender.com"
);



const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector(".container");
// Audio that will play on receiving messages.
var audio = new Audio('ting.mp3');

// Function which will append to the container.
const append = (message, position) => {
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messageElement.classList.add('message');
    messageElement.classList.add(position);
    messageContainer.append(messageElement);
    if (position == 'left') {
        audio.play();
    }

}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    append(`You:${message}`, 'right');
    socket.emit('send', message);
    messageInput.value = '';

})

// ask new user for his/her name and let the server know.
const name = prompt("Enter your name to join");
socket.emit('new-user-joined', name);

// if new user joins ,receive the event from the server.
socket.on('user-joined', name => {
    append(`${name}  joined  the chat`, 'right');
});

// if a server sends a message, receive it.
socket.on('receive', data => {
    append(`${data.name}: ${data.message} `, 'left');
});
// if a user leaves the chat , append the info to the container,
socket.on('left', name => {
    append(`${name} left the chat`, 'right');
});




