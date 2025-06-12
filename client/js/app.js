document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    app.innerHTML = `
        <h1>Bienvenue dans Bomberman !</h1>
        <input type="text" id="username" placeholder="Entrez votre pseudo" />
        <button id="joinButton">Rejoindre la partie</button>
    `;

    const joinButton = document.getElementById('joinButton');
    joinButton.addEventListener('click', () => {
        const username = document.getElementById('username').value.trim();
        if (username) {
            connectToWebSocket(username);
        } else {
            alert('Veuillez entrer un pseudo valide.');
        }
    });
});

function connectToWebSocket(username) {
    const socket = new WebSocket('ws://localhost:8080'); // Adresse du serveur WebSocket

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', username }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'lobby') {
            showLobby(message.players);
        }
    };
}

function showLobby(players) {
    // Affiche la salle d'attente (lobby) avec le nombre de joueurs
    document.getElementById('app').innerHTML = `
        <h1>Lobby</h1>
        <p>Joueurs connectés : ${players.length}</p>
        <div id="playerList">${players.join(', ')}</div>
        <p>Attendez que d'autres joueurs se connectent...</p>
    `;
}