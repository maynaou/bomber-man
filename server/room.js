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
   addPlayer(username,ws) {
    // console.log(username);
    
      const generateId = this.generatePlayerId()
      const palyer = new Player(generateId,ws,username)
      this.players.set(generateId,palyer)
      this.palyerJoin()

        this.broadcast({
            type: 'lobby',
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                username: p.username,
                 
            })),
            seconds : 'waiting for players'
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

      let timer = 10; 
    this.waitingTimer = setInterval(() => {
        console.log(timer);
        if ( this.players.size >= 2 && this.gameState === 'waiting') {
            this.broadcast({
                type : "waiting_start",
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
            console.log("timer : ",this.countdownTimer);
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
       const playerId = Array.from(this.players.keys())
       console.log("playerId : ",playerId);
       
       this.gameMap = new GenerateMapGame(13,15,playerId);
       const mapData = this.gameMap.generateMapData();
          
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

    handlePlayerMove(playerId, direction) {
       if (this.gameState !== 'playing') {
           return false;
       }

       const player = this.players.get(playerId);

       console.log("player : -------------- : ",player);
       
       if (!player) {
           return false;
       }

       const currentPos = this.gameMap.getPlayerPosition(playerId);
       if (!currentPos) {
           return false;
       }

       let newRow = currentPos.r;
       let newCol = currentPos.c;

       // Calculate new position based on direction
       switch(direction) {
           case 'up':
               newRow = currentPos.r - 1;
               break;
           case 'down':
               newRow = currentPos.r + 1;
               break;
           case 'left':
               newCol = currentPos.c - 1;
               break;
           case 'right':
               newCol = currentPos.c + 1;
               break;
           default:
               return false;
       }

       // Check if move is valid
       if (this.gameMap.isValidMove(newRow, newCol)) {
           // Update player position
           this.gameMap.updatePlayerPosition(playerId, newRow, newCol);
            this.gameMap = new GenerateMapGame(newRow,newCol,playerId);
       const mapData = this.gameMap.generateMapData();
           // Broadcast the move to all players
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
           
           return true;
       }
       
       return false;
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