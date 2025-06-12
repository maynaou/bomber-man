let socket;

function connectToWebSocket(username) {
    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', username }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };
}

function handleMessage(message) {
    switch (message.type) {
        case 'lobby':
            showLobby(message.players);
            break;
        // Gérer d'autres types de messages si nécessaire
    }
}