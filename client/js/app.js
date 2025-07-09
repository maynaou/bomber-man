// app.js
import { useState } from "../framework/state.js";
import { h, elementRef } from "../framework/dom.js";
import { renderAppFn } from "../framework/state.js";
import { connectToWebSocket, handlemoveplayer, handlechat} from "./websocket.js"

let globalUsername = null; // ✅ AJOUT: Variable globale pour le nom d'utilisateur

export function App(gameState, players = [], seconds = {}) {

  const [username, setUsername] = useState("");
  function handleJoinGame(username) {
    if (username.trim() !== "") {
      globalUsername = username.trim();
      connectToWebSocket(username.trim());
    } else {
      alert("Veuillez entrer un pseudo valide!");
    }
  }

  function playerssidebar(playerPositions = []) {
    return h("div", { class: "sidebar" }, [
      h("h3", { class: "sidebar-title" }, "🎮 Joueurs"),
      h("div", { class: "players-stats" },
        playerPositions.map(player => {
          const isCurrentUser = player.username === globalUsername;
          const isAlive = player.isAlive !== false;

          return h("div", {
            class: `player-stat ${isCurrentUser ? 'current-player' : ''} ${!isAlive ? 'dead-player' : ''}`
          }, [
            h("div", { class: "player-header" }, [
              h("span", { class: "player-name" }, player.username || "Joueur"),
              h("span", { class: "player-status" }, isCurrentUser ? "👤" : (isAlive ? "✅" : "💀"))
            ]),

            h("div", { class: "player-stats-grid" }, [
              h("div", { class: "stat-item" }, [
                h("span", { class: "stat-icon" }, "❤️"),
                h("span", { class: "stat-label" }, "lives:"),
                h("span", { class: "stat-value" }, `${player.stats.lives}`)
              ]),

              h("div", { class: "stat-item" }, [
                h("span", { class: "stat-icon" }, "🏃"),
                h("span", { class: "stat-label" }, "Vitesse:"),
                h("span", { class: "stat-value" }, `${player.stats.speed}`)
              ]),

              h("div", { class: "stat-item" }, [
                h("span", { class: "stat-icon" }, "💥"),
                h("span", { class: "stat-label" }, "Flames:"),
                h("span", { class: "stat-value" }, `${player.stats.flameRange}`)
              ]),

              h("div", { class: "stat-item" }, [
                h("span", { class: "stat-icon" }, "💣"),
                h("span", { class: "stat-label" }, "Power-ups:"),
                h("span", { class: "stat-value" }, `${player.stats.maxBombs}`)
              ])
            ])
          ]);
        })
      )
    ]);
  }

  function chat() {
    return h("div", { class: "chat-container" },
      [h("div", { class: "chat-messages", ref: elementRef.refchat },),
      h("input", {
        class: "chat-input",
        placeholder: "Entrez votre message...",
        onKeyPress: (e) => {
          if (e.key === 'Enter') {
            handlechat(username, e.target.value);
            e.target.value = "";
          }
        }
      }),
      ]);
  }

  function handle_win(playerPositions) {
    return h("div", { id: "congratulations" }, [
      h("h1", {}, "🎉 Congratulations! 🎉"),
      h("p", { id: "congratulations-message" }, `${playerPositions[0].username} Win The Game`),
      h("button", {
        type: "submit",
        onclick: () => renderAppFn(() => App("login"), mount),
      }, "Restart The Game")
    ])
  }

  function createMapFromDataWithAbsolutePositioning(mapData, rows, cols, activeBombs = [], playerPositions = []) {
    const mapCells = [];
    const playerElements = [];
    const bombElements = []

    // Créer d'abord toutes les cellules de base (murs, blocs, bombes)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let cellType = mapData[r][c];
        let cellClass = 'cell';

        switch (cellType) {
          case 'speed':
            cellClass += ' speed';

            break
          case 'flame':
            cellClass += ' flame';
            break
          case 'powerUp':
            cellClass += ' powerUp';
            break
          case 'wall':
            cellClass += ' wall';
            break;
          case 'block':
            cellClass += ' block';
            break;
          case 'cutted':
            cellClass += ' cutted';
            break;
          case 'empty':
          default:

            break;
        }

        const cellprops = {
          class: cellClass,
          'data-row': r,
          'data-col': c
        };

        mapCells.push(h("div", cellprops));
      }
    }
    // console.log("username : ", username);
    activeBombs.forEach(bomb => {
      const bombElement = h("div", {
        class: "bomb-absolute blink",
        id: `${bomb.playerId}`,
        style: `
                position: absolute;
                width: 40px;
                height: 40px;
                transform: translate(${bomb.pixelX}px, ${bomb.pixelY}px);
                z-index: 8;
                background-image: url('bomb.png');
                background-size: cover;
            `,
        'data-pixel-x': bomb.pixelX,
        'data-pixel-y': bomb.pixelY,
      });

      bombElements.push(bombElement);
    });
    // Créer les éléments joueurs avec positionnement absolu
    let count = 1
    playerPositions.forEach(player => {
      const isCurrentUser = player.username === globalUsername;

      // ✅ AJOUT: Vérifier si le joueur est endommagé
      const isDamaged = player.isDamaged || false;

      const playerElement = h("div", {
        class: `player-absolute ${player.direction} player-${count} ${isDamaged ? ' damaged' : ''}`,
        style: `
            position: absolute;
            width: 32px;
            height: 32px;
            transform: translate(${player.pixelX}px, ${player.pixelY}px);
            z-index: 10;
            transition: transform 0.2s ease;
        `,
        'data-pixel-x': player.pixelX,
        'data-pixel-y': player.pixelY,
        'data-grid-r': player.r,
        'data-grid-c': player.c,
        'data-username': player.username,
        'data-damaged': isDamaged,
        onkeydown: isCurrentUser ? (e) => {
          e.preventDefault();
          handlemoveplayer(e, globalUsername, player.pixelX, player.pixelY);
        } : null,
        tabindex: isCurrentUser ? 0 : -1,
        id: `player-controlled-${player.username}`,
      });

      playerElements.push(playerElement);
      count++
    });

    const mapContainer = h("div", {
      id: "map",
      class: "game-map",
      style: `
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            grid-template-rows: repeat(${rows}, 1fr);
            position: relative;
            width: ${cols * 40}px;
            height: ${rows * 40}px;
        `,
      onmousedown: (e) => {
        const currentPlayer = document.getElementById(`player-controlled-${globalUsername}`);
        if (currentPlayer && e.target !== currentPlayer) {
          setTimeout(() => currentPlayer.focus(), 0);
        }
      }
    }, [...mapCells, ...playerElements, ...bombElements]);

    setTimeout(() => {
      const currentPlayer = document.getElementById(`player-controlled-${globalUsername}`);
      if (currentPlayer) {
        currentPlayer.focus();
        // console.log("Focused on current player:", globalUsername);
      }
    }, 0);

    return mapContainer;
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
      ]),
      chat()
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
      ]),
      chat()
    ]);
  }

  if (gameState === 'game_start') {
    //  const playerList = Array.isArray(players) ? players : [];

    // Récupérer les données de la carte depuis le message
    const mapData = seconds.map?.data;
    const rows = seconds.map?.rows || 17;
    const cols = seconds.map?.cols || 21;
    const activeBombs = seconds.map?.activeBombs || [];
    const playerPositions = seconds.map?.playerPositions || [];
    if (playerPositions.length === 1) {

      return h("div", { class: "game-container", onkeydown: (e) => { handlemoveplayer(e) } }, [
        playerssidebar(playerPositions),
        mapData ? createMapFromDataWithAbsolutePositioning(mapData, rows, cols, activeBombs, playerPositions) : h("div", {}, "Chargement de la carte..."),
        chat(),
        handle_win(playerPositions),
      ]);
    }
    // const lives = seconds.map?.loves || 3;
    return h("div", { class: "game-container", onkeydown: (e) => { handlemoveplayer(e) } }, [
      playerssidebar(playerPositions),
      mapData ? createMapFromDataWithAbsolutePositioning(mapData, rows, cols, activeBombs, playerPositions) : h("div", {}, "Chargement de la carte..."),
      chat()
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
