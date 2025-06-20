// app.js
// import { request } from "undici-types";
import { useState } from "../framework/state.js";
import { h } from "../framework/dom.js";
import { renderAppFn } from "../framework/state.js";
import { connectToWebSocket,sendPlayerMove } from "./websocket.js"
export function App(gameState, players = [], seconds = {}) {
  console.log(seconds);

  const [username, setUsername] = useState("");
   const [currentPlayerId, setCurrentPlayerId] = useState(null);
  function handleJoinGame(username) {
    if (username.trim() !== "") {
      setCurrentPlayerId(username.trim())
      connectToWebSocket(username.trim());
    } else {
      console.log("Le nom d'utilisateur est vide");
      alert("Veuillez entrer un pseudo valide!");
    }
  }

  function handleKeyDown(event) {
    if (!currentPlayerId) return;
    
    const keyMappings = {
      'ArrowUp': 'up',
      'ArrowDown': 'down', 
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'KeyW': 'up',
      'KeyS': 'down',
      'KeyA': 'left',
      'KeyD': 'right',
      'Space': 'bomb' // Pour placer une bombe
    };
    
    const direction = keyMappings[event.code];
    console.log("hhhhhhhhhhhhhh",direction);
    if (direction) {
      
      
      event.preventDefault();
      sendPlayerMove(direction, currentPlayerId);
    }
  }

  function createMapFromData(mapData, rows, cols) {
    const mapCells = [];
       console.log(mapData);
       
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let cellType = mapData[r][c];
        let cellClass = 'cell';
        let playerId = null
         console.log("cellType");

         if (cellType.startsWith('player')) {
             playerId = cellType;
             cellType = 'player'
         }
         
        // const isPlayerPosition = playerPositions.some(pos => pos.row === r && pos.col === c);
        // console.log(isPlayerPosition);
    
          switch (cellType) {
            case 'wall':
              cellClass += ' wall';
              break;
            case 'block':
              cellClass += ' block';
              break;
              case 'player':
                console.log("cellType");
                
                   cellClass += ` player`;
              break;
            case 'empty':
            default:
              // Cellule vide, juste la classe de base
              break;
          }

            const cellProps = {
                class: cellClass,
                'data-row': r,
                'data-col': c
            };
            
            // Ajouter l'ID seulement pour les joueurs
            if (playerId) {
                cellProps.id = playerId;
            }
            
            mapCells.push(
                h("div", cellProps)
            );
      }
    }

    return h("div", {
      id: "map",
      class: "game-map",
      style: `
      display: grid;
      grid-template-columns: repeat(${cols}, 1fr);
      grid-template-rows: repeat(${rows}, 1fr);
    `
    }, mapCells);
  }

  if (gameState === 'login') {
    return h("div", { id: "nickname-form", class: "container" }, [
      h("h1", {}, "🎮 Bomberman Multiplayers"),
      h("div", { id: "join-form" }, [
        h("input", {
          type: "text",
          id: "nickname",
          placeholder: "Votre pseudo",
          maxLength: "15",
          value: username,
          onInput: (e) => {
            setUsername(e.target.value);
          },
          onKeyPress: (e) => {
            if (e.key === 'Enter') {
              handleJoinGame(username);
            }
          },
          required: true,
        }),
        h("br"),
        h("button", {
          type: "submit",
          onclick: () => handleJoinGame(username)
        }, "Rejoindre la partie")
      ])
    ]);
  }

  if (gameState === 'lobby') {
    // S'assurer que players est un array
    const playerList = Array.isArray(players) ? players : [];

    return h("div", { class: "container" }, [
      h("h1", { class: "title" }, "🎮 Bomberman"),

      // Section des joueurs
      h("div", { class: "players-section" }, [
        h("h2", {}, "Joueurs connectés:"),
        h("div", { class: "players-list" },
          playerList.length > 0
            ? playerList.map((player, index) => {
              // Récupérer le nom du joueur selon la structure des données
              const playerName = player.username || player.name || player || `Joueur ${index + 1}`;
              return h("div", { class: "player-item" }, [
                h("span", { class: "player-icon" }, "👤"),
                h("span", { class: "player-name" }, playerName)
              ]);
            })
            : [h("p", { class: "no-players" }, "En attente de joueurs...")]
        )
      ]),

      // Section du timer
      h("div", { class: "timer-section" }, [
        h("h2", {}, "Temps avant début:"),
        h("div", { class: "timer-display" }, [
          h("span", { class: "timer-number" }, `${seconds}`)
        ])
      ]),

      // Informations générales
      h("div", { class: "game-info" }, [
        h("p", {}, `${playerList.length} joueur(s) connecté(s)`),
        h("p", { class: "status-message" }, "En attente du début de la partie...")
      ])
    ]);
  }

  if (gameState === 'waiting_start') {
    const playerList = Array.isArray(players) ? players : [];

    return h("div", { class: "container" }, [
      h("h1", { class: "title" }, "🎮 Bomberman"),

      h("div", { class: "waiting-section" }, [
        h("h2", {}, "Préparation de la partie"),
        h("div", { class: "players-section" }, [
          h("h3", {}, "Joueurs prêts:"),
          h("div", { class: "players-list" },
            playerList.map((player) => {
              const playerName = player.username
              return h("div", { class: "player-item" }, [
                h("span", { class: "player-icon" }, "✅"),
                h("span", { class: "player-name" }, playerName)
              ]);
            })
          )
        ]),

        // Timer d'attente
        h("div", { class: "timer-section" }, [
          h("div", { class: "timer-display" }, [
            h("span", { class: "timer-number" }, `${seconds}`),
            h("span", { class: "timer-label" }, " secondes restantes")
          ]),
          h("p", { class: "timer-message" },
            playerList.length >= 4
              ? "4 joueurs connectés - Démarrage imminent!"
              : "En attente de plus de joueurs ou fin du timer..."
          )
        ])
      ])
    ]);
  }

  if (gameState === 'countdown_start') {
    const playerList = Array.isArray(players) ? players : [];

    return h("div", { class: "container" }, [
      h("h1", { class: "title" }, "🎮 Bomberman"),

      h("div", { class: "countdown-section" }, [
        h("h2", {}, "🚀 Démarrage de la partie !"),

        // Gros timer de countdown
        h("div", { class: "countdown-display" }, [
          h("span", { class: "countdown-number" }, `${seconds}`),
          h("span", { class: "countdown-label" }, " PRÉPAREZ-VOUS!")
        ]),

        // Liste des joueurs participants
        h("div", { class: "players-ready" }, [
          h("h3", {}, "Joueurs en partie:"),
          h("div", { class: "players-grid" },
            playerList.map((player) => {
              const playerName = player.username
              return h("div", { class: "player-ready" }, [
                h("span", { class: "player-icon" }, "🎯"),
                h("span", { class: "player-name" }, playerName)
              ]);
            })
          )
        ])
      ])
    ]);
  }

  if (gameState === 'game_start') {
    const playerList = Array.isArray(players) ? players : [];

    // Récupérer les données de la carte depuis le message
    const mapData = seconds.map?.data;
    const rows = seconds.map?.rows || 13;
    const cols = seconds.map?.cols || 15;
    const playerPositions = seconds.map?.playerPositions || [];

    return h("div", { 
      class: "game-container",
      tabindex: "0", // Pour permettre le focus et capturer les événements clavier
      style: "outline: none;", // Enlever la bordure de focus
      onKeyDown: handleKeyDown // Gestionnaire d'événement directement sur l'élément
    }, [
      mapData ? createMapFromData(mapData, rows, cols) : h("div", {}, "Chargement de la carte..."),
      
      // Instructions de contrôle
      h("div", { class: "player-info", style: "margin-top: 10px; text-align: center;" }, [
        h("p", { style: "font-weight: bold;" }, `Vous jouez en tant que: ${currentPlayerId}`),
        h("div", { class: "controls-info" }, [
          h("p", {}, "🎮 Utilisez les flèches ↑↓←→ ou WASD pour bouger"),
          h("p", {}, "💣 Appuyez sur ESPACE pour placer une bombe")
        ])
      ])
    ]);
  }

  // Default fallback
  return h("div", { class: "container" }, [
    h("div", { class: "title" }, "Bomberman"),
    h("div", { class: "game-box" }, [
      h("p", {}, "État de jeu inconnu...")
    ])
  ]);
}



const mount = document.getElementById("app");
renderAppFn(() => App("login"), mount);