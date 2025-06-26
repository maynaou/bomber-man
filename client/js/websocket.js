// websocket.js - Modifications pour envoyer les coordonnées en pixels

import { App } from "./app.js"
import { renderAppFn } from "../framework/state.js";
let socket;
let currentUsername = null; 
export function connectToWebSocket(username) {
    socket = new WebSocket('ws://localhost:8070');
    currentUsername = username
    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', username: username }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };
}

// ✅ MODIFICATION: Envoyer les coordonnées en pixels
export function handlemoveplayer(event, username, currentPixelX, currentPixelY) {
   // console.log("username : ",event.key,username,currentPixelX,currentPixelY);
    
      let directionValue = event.key;
    if (event.code) {
        directionValue = event.code;
    } 
    
    // Envoyer les coordonnées en pixels au serveur
    socket.send(JSON.stringify({ 
        type: 'move', 
        direction: directionValue,
        username: username,
        currentPixelX: currentPixelX,
        currentPixelY: currentPixelY
    }));
}

function handleMessage(message) {
    const mount = document.getElementById("app");
    switch (message.type) {
        case 'lobby':
            renderAppFn(() => App("lobby", message.players, message.seconds), mount);
            break;
        case 'waiting_start':
            renderAppFn(() => App("waiting_start", message.players, message.seconds), mount);
            break;
        case 'countdown_start':
            renderAppFn(() => App("countdown_start", message.players, message.seconds), mount);
            break;
        case 'game_start':
            renderAppFn(() => App("game_start", message.players, message), mount);
            // ✅ CORRECTION: Restaurer le focus après le re-render
            setTimeout(() => {
                const player = document.getElementById(`player-controlled-${currentUsername}`);
                if (player) {
                    player.focus();
                }
            }, 100);
            break;
            case 'bomb_exploded' : 
                   removeBombFromMap(message.r, message.c);
            break;
        case 'player_moved':            
            // ✅ NOUVEAU: Gérer la mise à jour des positions en pixels
            updatePlayerPosition(message.username, message.pixelX, message.pixelY, message.direction);
            break;
        case 'place_bombs':
            renderBomb(message.username,message.pixelX,message.pixelY)
            //updateBombsPosition(message.username,message.pixelX,message.pixelY,message.direction);
            break;
        case 'error':
            console.error("Server error:", message.message);
            alert(`Erreur: ${message.message}`);
            break;
        default:
            console.warn("Unknown message type:", message.type, "Full message:", message);
    }
}


function removeBombFromMap(r, c) {
    console.log("**************************************");
    
    // Trouve la bombe par position
    const bombs = document.querySelectorAll('.bomb-absolute');
    console.log(bombs);
    bombs.forEach(bomb => {
        const bx = bomb.dataset.pixelX;
        const by = bomb.dataset.pixelY;
        
        if (bx === c && by === r) 
            console.log("🧹 Removing bomb at", bx, by);{
            bomb.remove(); // 💥 supprime visuellement
        }
    });
}


function updatePlayerPosition(username, pixelX, pixelY, direction) {
        let playerElement = document.getElementById(`player-controlled-${username}`);
    
    if (!playerElement) {
        playerElement = document.querySelector(`[data-pixel-x="${pixelX}"][data-pixel-y="${pixelY}"]`);
    }
    
    if (playerElement) {
        playerElement.style.transform = `translate(${pixelX}px, ${pixelY}px)`;
        
        playerElement.dataset.pixelX = pixelX;
        playerElement.dataset.pixelY = pixelY;
        
        playerElement.className = playerElement.className.replace(/\b(front|back|left|right)\b/g, '');
        playerElement.classList.add(direction);
        
        if (playerElement.id === `player-controlled-${username}`) {
            setTimeout(() => {
                playerElement.focus();
            }, 0);
        }
    }
}

function renderBomb(username,pixelX, pixelY) {
    const bombElement = document.createElement("div");
    bombElement.className = "bomb-absolute blink";
    bombElement.id = `${username}`
    bombElement.style.position = "absolute";
    bombElement.style.width = "40px";
    bombElement.style.height = "40px";
    bombElement.style.transform = `translate(${pixelX}px, ${pixelY}px)`;
    bombElement.style.zIndex = "8";
    bombElement.style.backgroundImage = "url('bomb.png')"; // 🔁 mets le bon chemin
    bombElement.style.backgroundSize = "cover";
    bombElement.dataset.pixelX = pixelX;
    bombElement.dataset.pixelY = pixelY;

    document.getElementById("map")?.appendChild(bombElement);

    // 💥 Explosion après 3 secondes (facultatif)
}



