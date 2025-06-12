const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Créer un serveur HTTP
const server = http.createServer((req, res) => {
    // Servir le fichier HTML
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, '../client/index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Erreur du serveur');
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/style.css') {
        fs.readFile(path.join(__dirname, '../client/style.css'), (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Erreur du serveur');
            }
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(data);
        });
    }  else if (req.url.startsWith('/js/')) {
        const filePath = path.join(__dirname, '../client', req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Erreur du serveur');
            }
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(data);
        });
    }  else {
        res.writeHead(404);
        res.end('Page non trouvée');
    }
});

// Créer un serveur WebSocket en utilisant le même serveur HTTP
const wss = new WebSocket.Server({ server });
const players = [];

wss.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté');

    socket.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'join') {
            players.push(data.username);
            broadcast({ type: 'lobby', players });
        }
    });

    // Gérer la déconnexion
    socket.on('close', () => {
        const index = players.indexOf(socket.username);
        if (index !== -1) {
            players.splice(index, 1);
            broadcast({ type: 'lobby', players });
        }
    });
});

// Fonction pour envoyer un message à tous les clients
function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Démarrer le serveur sur le port 8080
server.listen(8080, () => {
    console.log('Serveur HTTP et WebSocket démarré sur http://localhost:8080');
});