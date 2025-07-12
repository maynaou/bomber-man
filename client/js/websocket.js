// websocket.js - Modifications pour envoyer les coordonnées en pixels

import { App } from "./app.js"
import { renderAppFn } from "../framework/state.js";
import { elementRef, createElement, h } from "../framework/dom.js";

// export let historychat = [];

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

// Variables pour le mouvement fluide
let currentDirection = null; 
let currentPixelX = null;
let currentPixelY = null;
let usernamee = null;
let keysPressed = new Set();
export let isMoving = false;
export let animationFrameId;

export function setIsMoving(value) {
    isMoving = value;
}

// Fonction pour démarrer le mouvement
export function handlemoveplayer(event, username, pixelX, pixelY) {
    let directionValue = event.key;
    if (event.code) {
        directionValue = event.code;
    }

    // Mise à jour des variables globales
    usernamee = username;
    currentPixelX = pixelX;
    currentPixelY = pixelY;

    if (event.type === 'keydown') {
        keysPressed.add(directionValue);
        
        // Démarrer le mouvement si pas déjà en cours
        if (!isMoving) {
            currentDirection = directionValue;
            startMovement();
        } else if (currentDirection !== directionValue ) {
            // Changer de direction
            currentDirection = directionValue;
        }
    } else if (directionValue === ' ') {
        keysPressed.delete(directionValue);
        
        // Arrêter le mouvement si c'était la direction actuelle et plus de touches pressées
        if (currentDirection === directionValue && keysPressed.size === 0) {
            stopMovement();
        }
    }
}

function startMovement() {
    if (isMoving) return;
    isMoving = true;
    gameLoop();
}

function stopMovement() {
    isMoving = false;
    currentDirection = null;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Boucle de jeu améliorée avec requestAnimationFrame
export function gameLoop() {
    if (!isMoving || !currentDirection) {
        return;
    }

    // Envoyer la commande de mouvement au serveur
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'move',
            direction: currentDirection,
            username: usernamee,
            currentPixelX: currentPixelX,
            currentPixelY: currentPixelY
        }));
    }

    // Continuer la boucle
    animationFrameId = requestAnimationFrame(gameLoop);
}

function handleMessage(message) {
    
    const mount = document.getElementById("app");
    switch (message.type) {
        case 'login':
            renderAppFn(() => App("login",[],message.message), mount);
            break;
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
        case 'chat':
            // historychat.push(message)
            elementRef.refchat.ref.appendChild(
                createElement(h("div", { class: "chat-message" }, message.username, ": ", message.message))
            )
            elementRef.refchat.ref.scrollTop = elementRef.refchat.ref.scrollHeight;
            break;
        case 'chat_history':
             console.log("--------------------------------------");
              if (elementRef.refchat && elementRef.refchat.ref) {
               elementRef.refchat.ref.innerHTML = '';
              }
            for (const chat of message.history) {
                // historychat.push(chat)
                 if (elementRef.refchat && elementRef.refchat.ref) {
                elementRef.refchat.ref.appendChild(
                    createElement(h("div", { class: "chat-message" }, chat.username, ": ", chat.message))
                )
              }
            }
            // elementRef.refchat.ref
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
    // console.log("Sending chat message:", message);
    socket.send(JSON.stringify({
        type: 'chat',
        username: username,
        message: message
    }));
}

// let frameCount = 0;
// let lastFrameTime = performance.now();

// function monitorFrameRate() {
//     const now = performance.now();
//     frameCount++;
    
//     if (now - lastFrameTime >= 1000) {
//         console.log(`FPS: ${frameCount}`);
//         frameCount = 0;
//         lastFrameTime = now;
//     }
    
//     requestAnimationFrame(monitorFrameRate);
// }

// // Démarrer le monitoring
// monitorFrameRate();
