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
            // ✅ CORRECTION: Restaurer le focus après le re-
              setTimeout(() => {
                const player = document.getElementById(`player-controlled-${currentUsername}`);
                if (player) {
                    player.focus();
                }
            }, 100);
            break;
        case 'error':
            console.error("Server error:", message.message);
            alert(`Erreur: ${message.message}`);
            break;
        default:
            console.warn("Unknown message type:", message.type, "Full message:", message);
    }
}