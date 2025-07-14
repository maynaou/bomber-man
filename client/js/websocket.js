import { App } from "./app.js"
import { renderAppFn } from "../framework/state.js";
import { elementRef, createElement, h } from "../framework/dom.js";

export let historychat = [];

let socket;
let currentUsername = null;
export function connectToWebSocket(username) {
    socket = new WebSocket(`ws://${window.location.hostname}:8070`);
    currentUsername = username
    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', username: username }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };
}

// Fonction pour démarrer le mouvement
let isMoving = false;
let currentDirection = null;
export let animationFrameId = null;
let playerData = { username: null, pixelX: null, pixelY: null };

export function setIsMoving(value) {
    isMoving = value;
}

// Fonction principale pour gérer le mouvement
export function handlemoveplayer(event, username, pixelX, pixelY) {
    const direction = event.code === 'Space' ? 'Space' : event.key;
    
    // Mettre à jour les données du joueur
    playerData = { username, pixelX, pixelY };
    
    if (direction === 'Space') {
        // Arrêter le mouvement avec la barre d'espace
        stopMovement();
        sendMoveCommand(direction);
    } else {
        // Démarrer ou changer de direction
        if (!isMoving) {
            startMovement(direction);
        } else {
            currentDirection = direction;
        }
    }
}

// Démarrer le mouvement
function startMovement(direction) {
    if (isMoving) return;
    
    isMoving = true;
    currentDirection = direction;
    gameLoop();
}

// Arrêter le mouvement
function stopMovement() {
    isMoving = false;
    currentDirection = null;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Boucle de jeu
function gameLoop() {
    if (!isMoving || !currentDirection) return;
    
    sendMoveCommand(currentDirection);
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Envoyer la commande au serveur
function sendMoveCommand(direction) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'move',
            direction: direction,
            username: playerData.username,
            currentPixelX: playerData.pixelX,
            currentPixelY: playerData.pixelY
        }));
    }
}


function handleMessage(message) {

    const mount = document.getElementById("app");
    switch (message.type) {
        case 'login':
            renderAppFn(() => App("login", [], message.message), mount);
            break;
        case 'lobby':
            renderAppFn(() => App("lobby", message.players, message.seconds), mount);
            requestChatHistory()
            break;
        case 'waiting_start':
            renderAppFn(() => App("waiting_start", message.players, message.seconds), mount);
            requestChatHistory()
            break;
        case 'countdown_start':
            renderAppFn(() => App("countdown_start", message.players, message.seconds), mount);
            requestChatHistory()
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
        case 'chat':
            // historychat.push(message)
            elementRef.refchat.ref.appendChild(
                createElement(h("div", { class: "chat-message" }, message.username, ": ", message.message))
            )
            elementRef.refchat.ref.scrollTop = elementRef.refchat.ref.scrollHeight;
            break;
        case 'chat_history':
            if (elementRef.refchat && elementRef.refchat.ref) {
                elementRef.refchat.ref.innerHTML = '';
            }
            for (const chat of message.history) {
                if (elementRef.refchat && elementRef.refchat.ref) {
                    elementRef.refchat.ref.appendChild(
                        createElement(h("div", { class: "chat-message" }, chat.username, ": ", chat.message))
                    )
                }
            }
            break
        case 'error':
            console.error("Server error:", message.message);
            alert(`Erreur: ${message.message}`);
            break;
        default:
            console.warn("Unknown message type:", message.type, "Full message:", message);
    }
}

export function handlechat(username, message) {
    socket.send(JSON.stringify({
        type: 'chat',
        username: username,
        message: message
    }));
}

function requestChatHistory() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'request_chat_history'
        }));
    }
}