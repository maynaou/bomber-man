import { App } from "./app.js"
import { renderAppFn } from "../framework/state.js";
let socket;

export function connectToWebSocket(username) {

    socket = new WebSocket('ws://localhost:8070');

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', username: username }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };
}

function handleMessage(message) {
    // showLobby(message.players);
     const mount = document.getElementById("app");  
    switch (message.type) {
        case 'lobby':
             renderAppFn(()=>App("lobby", message.players,message.seconds), mount);
            break;
        case 'waiting_start':
             renderAppFn(()=>App("waiting_start",message.players, message.seconds), mount);
            break;
        case 'countdown_start':
             renderAppFn(() => App("countdown_start", message.players, message.seconds), mount);
      break;
      
      case 'game_start':
      renderAppFn(() => App("game_start", message.players, message), mount);
      break;
      
      case 'error':
      console.error("Server error:", message.message);
      alert(`Erreur: ${message.message}`);
      break;
      
     default:
      console.warn("Unknown message type:", message.type, "Full message:", message);
    }
}

