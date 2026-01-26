# Bomber-Man (DOM)

Petit projet de type Bomberman implémenté en JavaScript/DOM avec un serveur WebSocket en Node.js.

## Description

Le client est une application front-end basée sur des fichiers statiques (HTML/CSS/JS) situés dans le dossier `client/`. Le serveur WebSocket et la logique de jeu côté serveur se trouvent dans `server/`.

Le serveur écoute sur le port `8070` (WebSocket) et gère les salles, joueurs et événements du jeu.

## Prérequis
- Node.js 16+ (ou version moderne compatible ES modules)
- npm (pour installer les dépendances côté serveur)

## Installation

1. Installer les dépendances du serveur :

```bash
cd server
npm install
```

2. (Optionnel) Servir le dossier `client/` via un serveur statique pour développer :

```bash
# Avec Python 3
# cd client
# python3 -m http.server 8070

# Puis ouvrir http://localhost:8000 dans votre navigateur
```

Ou utilisez un utilitaire de votre choix (`npx serve client`, `live-server`, etc.).

## Lancer le projet

1. Démarrer le serveur WebSocket :

```bash
node server/server.js
```

2. Ouvrir le client dans le navigateur (ouvrir `client/index.html` ou via le serveur statique ci-dessus). Le client se connectera au serveur WebSocket sur `ws://localhost:8070`.

## Structure du projet

- `client/` : frontend statique
  - `index.html` : point d'entrée
  - `js/` : code client (ex. `app.js`, `websocket.js`)
  - `Assets/` : images et styles
- `server/` : logique serveur
  - `server.js` : serveur HTTP + WebSocket
  - `room.js`, `player.js`, `mapGame.js` : logique du jeu
  - `package.json` : dépendances serveur (`ws`)

## Notes de développement
- Le serveur utilise `ws` pour les WebSockets et exporte une instance `room` (voir `server/server.js`).
- Les messages échangés sont des JSON contenant un champ `type` (ex. `join`, `move`, `chat`).

## Contribution
- Ouvrez une issue pour proposer des améliorations ou corriger des bugs.
- Pour des modifications rapides, créez une branche et soumettez une pull request.

## Licence
Projet personnel — ajoutez une licence si vous souhaitez partager publiquement.
