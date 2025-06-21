// app.js
// import { request } from "undici-types";
import { useState } from "../framework/state.js";
import { h } from "../framework/dom.js";
import { renderAppFn } from "../framework/state.js";
import { connectToWebSocket,handlemoveplayer } from "./websocket.js"
export function App(gameState, players = [], seconds = {}) {
  

  const [username, setUsername] = useState("");
  function handleJoinGame(username) {
    if (username.trim() !== "") {
      connectToWebSocket(username.trim());
    } else {
      alert("Veuillez entrer un pseudo valide!");
    }
  }

  function createMapFromData(mapData, rows, cols) {
    const mapCells = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let cellType = mapData[r][c];

        
        let direction = ""
        let cellClass = 'cell';

        console.log("celltype : ",cellType);
        
        // console.log(isPlayerPosition);
          if (cellType.startsWith('player')) {
              direction = cellType.split(" ")[1]
              console.log(direction);
              
              cellType = 'player'
          }
    
          switch (cellType) {
            case 'wall':
              cellClass += ' wall';
              break;
            case 'bombs': 
            cellClass += ' bombs'
            // cellClass += ' player ' + direction;

                 break
            case 'block':
              cellClass += ' block';
              break;
           case  'player':            
              cellClass += ' player ' + direction;
              break;
            case 'empty':
            default:
              // Cellule vide, juste la classe de base
              break;
          }

          console.log("cell state ==>", cellClass);

        const cellprops =  {
            class: cellClass,
            'data-row': r,
            'data-col': c
          }

          if (cellClass = 'cell player') {

            // cellprops["data-row"] = `${r*40}px`
            // cellprops["data-col"] = `${c*40}px`

            cellprops.onkeydown = (e) => {
              handlemoveplayer(e,username)
            }
           cellprops.tabindex = 0;

          }

        mapCells.push(h("div" ,cellprops))
        
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

    return h("div", { class: "game-container" }, [
      mapData ? createMapFromData(mapData, rows, cols) : h("div", {}, "Chargement de la carte..."),
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
