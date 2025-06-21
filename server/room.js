import { Player } from "./player.js";
import { GenerateMapGame } from "./mapGame.js";
export class Room {
    constructor() {
        this.players = new Map();
        this.gameState = "waiting"
        this.waitingTimer = null;
        this.countdownTimer = null;
        this.gameMap = null

    }
    addPlayer(username, ws) {
        // console.log(username);

        const generateId = this.generatePlayerId()
        const palyer = new Player(generateId, ws, username)
        this.players.set(generateId, palyer)
        this.palyerJoin()

        this.broadcast({
            type: 'lobby',
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                username: p.username,

            })),
            seconds: 'waiting for players'
        });

        return generateId;
    }
    generatePlayerId() {
        return Math.random().toString(36).substr(2, 9);
    }

    palyerJoin() {
        const playerCount = this.players.size

        if (playerCount === 2) {
            this.startWaitingTimer();
        }

        if (playerCount === 4) {
            this.clearWaitingTimer();
            this.startCountdown();


        }
    }

    startWaitingTimer() {
        if (this.waitingTimer) return

        let timer = 5;
        this.waitingTimer = setInterval(() => {
            if (this.players.size >= 2 && this.gameState === 'waiting') {
                this.broadcast({
                    type: "waiting_start",
                    players: Array.from(this.players.values()).map(p => ({
                        id: p.id,
                        username: p.username,

                    })),
                    seconds: timer
                });
                timer--;

                if (timer < 0) {
                    this.clearWaitingTimer()
                    this.startGame(); // Move this outside the interval
                }
            }
        }, 1000);
    }

    startCountdown() {
        if (this.gameState !== 'waiting') return

        this.gameState = 'countdown'
        let timer = 10
        // Timer de 10 secondes
        this.countdownTimer = setInterval(() => {
            this.broadcast({
                type: 'countdown_start',
                players: Array.from(this.players.values()).map(p => ({
                    id: p.id,
                    username: p.username,
                })),
                seconds: timer
            });

            timer--
            if (timer < 0) {
                this.clearCountDown()
                this.startGame();
            }

        }, 1000);

    }



    startGame() {
        this.gameState = 'playing';
        const playerIds = Array.from(this.players.keys());
        this.gameMap = new GenerateMapGame(13, 15, playerIds);
        const mapData = this.gameMap.mapData;
        this.broadcast({
            type: 'game_start',
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                username: p.username,
            })),
            map: {
                data: mapData,
                rows: this.gameMap.rows,
                cols: this.gameMap.cols,
                playerPositions: this.gameMap.getPlayerPositions()
            }
        });
    }

    clearWaitingTimer() {
        if (this.waitingTimer) {
            clearInterval(this.waitingTimer)
            this.waitingTimer = null
        }
    }

    clearCountDown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer)
            this.countdownTimer = null
        }
    }

    handlePlayerMove(data) {
        Array.from(this.players.values()).forEach((player) => {
            if (data.username === player.username) {
                const mapData = this.gameMap.moveplayer(data.direction, player.id)
                this.broadcast({
                    type: 'game_start',
                    players: Array.from(this.players.values()).map(p => ({
                        id: p.id,
                        username: p.username,
                    })),
                    map: {
                        data: mapData,
                        rows: this.gameMap.rows,
                        cols: this.gameMap.cols,
                        playerPositions: this.gameMap.getPlayerPositions()
                    }
                });
            }
        })
    }

    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.players.forEach(player => {
            if (player.ws.readyState === 1) { // WebSocket.OPEN = 1
                try {
                    player.ws.send(messageStr);
                } catch (error) {
                    console.error('Error sending message to player:', error);
                }

            }

        });
    
    }
}