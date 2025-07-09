import { Room } from "./room.js"
import http from "http"
import { WebSocketServer } from "ws"
// const wsSocket = require("ws")

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
})

const wss = new WebSocketServer({ server })
export const room = new Room()
export const playerConnections = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'join':
                    if (room.players.size < 4 && room.gameStart) {
                        // console.log(data);
                        const playerId = room.addPlayer(data.username, ws)
                        playerConnections.set(ws, playerId)
                    }

                    break;
                case 'move':

                    //console.log(data);
                    room.handlePlayerMove(data); // direction = 'up', 'down' etc.
                    break
                case 'chat':
                    room.handleChat(data);
                    break;
            }
        } catch (error) {
            console.error('Erreur parsing message:', error);
        }
    });

    ws.on('close', () => {
        let disconnectedPlayerId = null;

        for (let [key, player] of room.players.entries()) {
            if (player.ws === ws) {
                disconnectedPlayerId = key
                playerConnections.delete(ws)
                room.players.delete(key);
            }
        }

        if (room.gameState === 'playing' && disconnectedPlayerId && room.gameMap) {
            room.gameMap.playerPositions = room.gameMap.playerPositions.filter(
                player => player.id !== disconnectedPlayerId
            );

            // Nettoyer les bombes du joueur déconnecté
            room.gameMap.activeBombs = room.gameMap.activeBombs.filter(
                bomb => bomb.playerId !== disconnectedPlayerId
            );

            // Vérifier la fin du jeu
            room.gameMap.checkGameEnd();

            // Notifier les autres joueurs
        } else if (room.players.size === 1 && room.gameStart) {
            room.clearWaitingTimer()
            room.gameState = "waiting"
            room.waitingTimer = null;
            room.countdownTimer = null;

            room.broadcast({
                type: "lobby",
                players: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    username: p.username,

                })),
                seconds: 'waiting for players'
            });

        }
        // console.log(playerConnections);
    });
});

server.listen(8070, () => {
    console.log('Server running on http://localhost:8080')
})