// websocket.js - Modifications pour envoyer les coordonnées en pixels

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

let currentDirection = null; 
let currentPixelX = null
let currentPixelY = null
let usernamee = null

export let isMoving = false



// ✅ MODIFICATION: Envoyer les coordonnées en pixels
export function handlemoveplayer(event, username, currentPixelX, currentPixelY) {

    console.log("----");
    
    currentDirection = event.key
    let directionValue = event.key;
    if (event.code) {
        directionValue = event.code;
    }

    currentPixelX = currentPixelX
    currentPixelY = currentPixelY

    usernamee = username

    // isMoving = false
        socket.send(JSON.stringify({
        type: 'move',
        direction: directionValue,
        username: username,
        currentPixelX: currentPixelX,
        currentPixelY: currentPixelY
    }));
    // Envoyer les coordonnées en pixels au serveur
   
    // gameLoop()
}

export let animationFrameId;


export function gameLoop() {   
    isMoving = true     
    if (!isMoving) return; 
    handlemoveplayer({ key: currentDirection }, usernamee, currentPixelX, currentPixelY);
    // console.log("----------------------------");
    
    animationFrameId = requestAnimationFrame(gameLoop); // Appel récursif pour la prochaine frame
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
        case 'chat':
            historychat.push(message)
            elementRef.refchat.ref.appendChild(
                createElement(h("div", { class: "chat-message" }, message.username, ": ", message.message))
            )
            elementRef.refchat.ref.scrollTop = elementRef.refchat.ref.scrollHeight;
            break;
        case 'chat_history':
            for (const chat of message.history) {
                historychat.push(chat)
                elementRef.refchat.ref.appendChild(
                    createElement(h("div", { class: "chat-message" }, chat.username, ": ", chat.message))
                )
            }
            elementRef.refchat.ref
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
    console.log("Sending chat message:", message);
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
