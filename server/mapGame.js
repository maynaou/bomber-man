import { Player } from "./player.js";
import { playerConnections } from "./server.js";
import { room } from "./server.js";
export class GenerateMapGame {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.playerPositions = this.generatePlayerPositions();
        this.mapData = this.generateMapData();
        this.player = null
        this.activeBombs = [];
        this.cellSize = 40;
        this.bonuses = [];
    }

    generatePlayerPositions() {
        const cornerPositions = [
            { r: 1, c: 1 },
            { r: 1, c: this.cols - 2 },
            { r: this.rows - 2, c: 1 },
            { r: this.rows - 2, c: this.cols - 2 },
        ];

        return Array.from(room.players.values()).map((player, index) => {
            return {
                username: player.username,
                id: player.id,
                r: cornerPositions[index].r,
                c: cornerPositions[index].c,
                pixelX: cornerPositions[index].c * 40,
                pixelY: cornerPositions[index].r * 40,
                direction: 'front',
                isAlive: true,
                isDamaged: false,
                stats: {
                    lives: 3,
                    speed: 4,
                    flameRange: 1,
                    maxBombs: 1
                }
            };
        });
    }

    generateMapData() {
        const mapData = [];

        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                let cellType = 'empty';
                if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
                    cellType = 'wall';
                }
                else if (r % 2 === 0 && c % 2 === 0) {
                    cellType = 'wall';
                }
                else if (
                    this.playerPositions.some(p =>
                        Math.abs(p.r - r) <= 1 && Math.abs(p.c - c) <= 1
                    )
                ) {
                    cellType = 'empty';
                } else {
                    if (Math.random() < 0.5) {
                        cellType = 'block';
                    }
                }
                row.push(cellType);
            }
            mapData.push(row);
        }

        return mapData;
    }

    movePlayerByPixels(currentPixelX, currentPixelY, direction, playerId) {
        const player = this.playerPositions.find(p => p.id === playerId);
        if (!player) return null;

        this.player = player

        if (direction === 'Space' || direction === ' ') {
            const hasBomb = this.placeBombs();
            if (hasBomb) {

                const playerBombs = this.activeBombs.filter(bomb => bomb.playerId === this.player.id);
                const place_bombs = playerBombs[playerBombs.length - 1];

                if (place_bombs) {

                    return {
                        success: true,
                        type: 'place_bombs',
                        action: 'bomb'
                    };
                }
            }
        }

        const moveSpeed = player.stats.speed
        let newPixelX = currentPixelX;
        let newPixelY = currentPixelY;

        switch (direction) {
            case 'ArrowUp':
                player.direction = 'back';
                newPixelY -= moveSpeed;
                break;
            case 'ArrowRight':
                player.direction = 'right';
                newPixelX += moveSpeed;
                break;
            case 'ArrowLeft':
                player.direction = 'left';
                newPixelX -= moveSpeed;
                break;
            case 'ArrowDown':
                player.direction = 'front';
                newPixelY += moveSpeed;
                break;
            default:
                return null;
        }

        if (!this.isValidMove(newPixelX, newPixelY)) {
            return null; // Invalid movement
        }

        const newGridR = Math.floor(newPixelY / this.cellSize);
        const newGridC = Math.floor(newPixelX / this.cellSize);

        if (newGridR >= 0 && newGridR < this.rows && newGridC >= 0 && newGridC < this.cols) {
            player.r = newGridR;
            player.c = newGridC;
            this.collectBonus(newGridR, newGridC);
        }

        player.pixelX = newPixelX;
        player.pixelY = newPixelY;

        this.updateBombGracePeriod();

        return {
            success: true,
            type: 'game_start',
            action: 'move'
        };
    }

    isValidMove(pixelX, pixelY) {
        const topLeftGridR = Math.floor(pixelY / this.cellSize);
        const topLeftGridC = Math.floor(pixelX / this.cellSize);
        const bottomRightGridR = Math.floor((pixelY + 32 - 1) / this.cellSize);
        const bottomRightGridC = Math.floor((pixelX + 32 - 1) / this.cellSize);

        for (let r = topLeftGridR; r <= bottomRightGridR; r++) {
            for (let c = topLeftGridC; c <= bottomRightGridC; c++) {
                if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
                    return false;
                }

                const cellType = this.mapData[r][c];

                if (cellType === 'wall' || cellType === 'block') {
                    return false;
                }

                const bombHere = this.activeBombs.find(b => b.r === r && b.c === c);
                if (bombHere) {
                    if (bombHere.playerId === this.player.id && bombHere.canPassThrough) {
                        continue; // Permettre le passage
                    } else {
                        return false; // Bloquer
                    }
                }
            }
        }

        return true;
    }

    updateBombGracePeriod() {
        const bomb = this.activeBombs.find(
            b => b.playerId === this.player.id && b.canPassThrough
        );

        if (!bomb) return;

        const bombPixelX = bomb.c * this.cellSize;
        const bombPixelY = bomb.r * this.cellSize;

        const insideBombCell =
            this.player.pixelX < bombPixelX + this.cellSize &&
            this.player.pixelX + this.cellSize > bombPixelX &&
            this.player.pixelY < bombPixelY + this.cellSize &&
            this.player.pixelY + this.cellSize > bombPixelY;

        if (!insideBombCell) {
            bomb.canPassThrough = false;
        }
    }

    placeBombs() {
        const playerActiveBombs = this.activeBombs.filter(bomb => bomb.playerId === this.player.id);
        const hasReachedMaxBombs = playerActiveBombs.length >= this.player.stats.maxBombs;

        if (!hasReachedMaxBombs) {
            // Calculer la position de grille basée sur les pixels du centre du joueur
            const playerCenterX = this.player.pixelX + 20; // Centre du joueur (40px/2)
            const playerCenterY = this.player.pixelY + 20;
            // Position de grille la plus proche du centre du joueur
            const gridR = Math.floor(playerCenterY / this.cellSize);
            const gridC = Math.floor(playerCenterX / this.cellSize);
            // Vérifier que la position est valide et qu'il n'y a pas déjà une bombe
            if (gridR >= 0 && gridR < this.rows &&
                gridC >= 0 && gridC < this.cols &&
                !this.activeBombs.some(bomb => bomb.r === gridR && bomb.c === gridC)) {
                // Placer la bombe à la position de grille calculée
                this.activeBombs.push({
                    r: gridR,
                    c: gridC,
                    playerId: this.player.id,
                    canPassThrough: true,
                    pixelX: gridC * this.cellSize,
                    pixelY: gridR * this.cellSize
                });
                // this.player.lastBombCell = { r: gridR, c: gridC };
                //console.log(" bomb placd legth ==> ", this.activeBombs.length, "statz : ", this.player.stats.maxBombs);
                setTimeout(() => {
                    room.handleBombExplosion()
                    this.explodeBomb(gridR, gridC);
                    this.handleExplosionDamage(gridR, gridC)
                    room.handleBombExplosion()
                }, 4000);

                setTimeout(() => {
                    this.explodeBomb(gridR, gridC);
                    room.handleBombExplosion()
                }, 4700);

                return true
            }
        }

        return false
    }


    handleExplosionDamage(bombR, bombC) {
        //const bomberPlayer = this.playerPositions.find(p => p.id === this.player.id);
        const flameRange = this.player ? this.player.stats.flameRange : 1;

        // Check if any player is at the bomb location
        this.checkPlayerDamage(bombR, bombC);

        // Check explosion in all 4 directions avec la portée de flamme
        const directions = [
            { dr: -1, dc: 0 }, // up
            { dr: 1, dc: 0 },  // down
            { dr: 0, dc: -1 }, // left
            { dr: 0, dc: 1 }   // right
        ];

        for (const { dr, dc } of directions) {
            for (let step = 1; step <= flameRange; step++) {
                const nr = bombR + (dr * step);
                const nc = bombC + (dc * step);

                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const cellType = this.mapData[nr][nc];

                    // Vérifier les dégâts aux joueurs
                    this.checkPlayerDamage(nr, nc);

                    // Arrêter la propagation si on hit un mur ou un bloc
                    if (cellType === 'wall') {
                        break;
                    }
                    if (cellType === 'block') {
                        break; // Les blocs arrêtent la propagation après avoir été touchés
                    }
                } else {
                    break; // Sortie de la carte
                }
            }
        }
    }

    // NEW METHOD: Check if a player is at a specific grid position and damage them
    checkPlayerDamage(gridR, gridC) {
        this.playerPositions.forEach(player => {
            if (!player.isAlive) return;

            // Check if player's current grid position matches the explosion position
            if (player.r === gridR && player.c === gridC) {
                this.damagePlayer(player.id);
            }
        });
    }

    // NEW METHOD: Handle player damage
    damagePlayer(playerId) {
        const player = this.playerPositions.find(p => p.id === playerId);
        if (!player || !player.isAlive) return;
        const getplayer = Player.getPlayerStatusById(playerId)
        const isAlive = getplayer.lives > 0 ? true : false
        player.stats.lives = getplayer.lives
        player.isAlive = isAlive

        if (!isAlive) {
            player.isDamaged = true
            room.handleBombExplosion()
            // Retirer le joueur après un délai pour l'animation de mort
            setTimeout(() => {
                this.removeDeadPlayer(playerId);
            }, 1500);
        } else {
            player.isDamaged = true;

            setTimeout(() => {
                player.isDamaged = false;
                room.handleBombExplosion()
            }, 3000);

            room.handleBombExplosion()

        }
    }

    removeDeadPlayer(playerId) {
        this.playerPositions = this.playerPositions.filter(player => player.id !== playerId);
        this.activeBombs = this.activeBombs.filter(bomb => bomb.playerId !== playerId);
        room.handleBombExplosion('player_eliminated')

        // Vérifier s'il reste assez de joueurs pour continuer le jeu
        this.checkGameEnd();
    }

    checkGameEnd() {
        // Compter les joueurs encore vivants
        const alivePlayers = this.playerPositions.filter(player => player.isAlive);

        console.log(`Joueurs encore en vie: ${alivePlayers.length}`);
        if (alivePlayers.length === 1) {
           room.handleBombExplosion()
           playerConnections.clear()
           room.resetGame()
        }

        // Si il ne reste aucun joueur (égalité/tous morts en même temps)
        else if (alivePlayers.length === 0) {
            console.log("💀 Partie terminée! Tous les joueurs sont morts - Match nul");
            room.handleBombExplosion()
            playerConnections.clear()
            room.resetGame()
        }

        // Si il reste plus d'un joueur, le jeu continue
        else {
            console.log(`Jeu en cours... ${alivePlayers.length} joueurs restants`);
        }
    }

   /* endGame(result, winner = null) {
    // Notifier la fin de partie
   room.broadcast({
        type: 'game_end',
        result: result,
        winner: winner ? {
            id: winner.id,
            username: winner.username
        } : null,
        players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            username: p.username,
        }))
    });

    // Reset du jeu après un délai
    setTimeout(() => {
        room.resetGame();
        // Vider les connexions des joueurs
        playerConnections.clear();
        
        // Notifier que le lobby est prêt
        room.broadcast({
            type: 'lobby',
            players: [],
            seconds: 'waiting for players'
        });
    }, 5000); // 5 secondes pour voir le résultat
}*/

    explodeBomb(r, c) {
        this.activeBombs = this.activeBombs.filter(b => !(b.r === r && b.c === c));
       // const player = this.playerPositions.find(p => p.id === this.player.id);
        const flameRange = this.player ? this.player.stats.flameRange : 1;

        if (!this.player) {
            this.cleanupCuttedTiles()
            return
        }
        // Fonction pour générer un bonus aléatoire
        const generateRandomBonus = () => {
            const bonusTypes = ['speed', 'flame', 'powerUp'];
            const bonusChance = 0.8; // 30% de chance d'obtenir un bonus
            if (Math.random() < bonusChance) {
                return bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
            }
            return null;
        };

        if (this.mapData[r][c] === 'cutted') {
            this.mapData[r][c] = 'empty';
        } else if (this.mapData[r][c] === 'empty') {
            this.mapData[r][c] = 'cutted';
        } else {
            this.mapData[r][c] = 'cutted';
        }

        const directions = [
            { dr: -1, dc: 0 }, // haut
            { dr: 1, dc: 0 },  // bas
            { dr: 0, dc: -1 }, // gauche
            { dr: 0, dc: 1 }   // droite
        ];

        for (const { dr, dc } of directions) {
            for (let step = 1; step <= flameRange; step++) {
                const nr = r + (dr * step);
                const nc = c + (dc * step);
                const hasBonus = this.bonuses ? this.bonuses.find(b => b.r === nr && b.c === nc) : null;

                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const target = this.mapData[nr][nc];


                    if (target === 'wall') break
                    if (target === 'block') {
                        const bonus = generateRandomBonus();
                        this.bonuses.push({
                            r: nr,
                            c: nc,
                            type: bonus,
                            shouldRestore: true
                        });

                        this.mapData[nr][nc] = 'cutted';
                    } else if (target === 'empty') {
                        this.mapData[nr][nc] = 'cutted';
                    } else if (['speed', 'flame', 'powerUp'].includes(target) && !hasBonus.shouldRestore) {
                        this.mapData[nr][nc] = 'cutted';
                        if (hasBonus) {
                            hasBonus.shouldRestore = true;
                        }
                    } else if (target === 'cutted') {

                        if (hasBonus && hasBonus.shouldRestore) {
                            this.mapData[nr][nc] = hasBonus.type;
                            hasBonus.shouldRestore = false;
                        } else {
                            this.mapData[nr][nc] = 'empty';
                        }
                    } else {
                        this.mapData[nr][nc] = 'cutted';
                    }
                }
            }
        }
    }

    cleanupCuttedTiles() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.mapData[r][c] === 'cutted') {
                    // Vérifier s'il y a un bonus à restaurer
                    const bonus = this.bonuses ? this.bonuses.find(b => b.r === r && b.c === c && b.shouldRestore) : null;

                    if (bonus) {
                        this.mapData[r][c] = bonus.type;
                        bonus.shouldRestore = false;
                    } else {
                        this.mapData[r][c] = 'empty';
                    }
                }
            }
        }
    }

    // Fonction pour collecter un bonus quand un joueur marche dessus
    collectBonus(r, c) {
        const bonusType = this.mapData[r][c];

        const playerCenterX = this.player.pixelX + 20; // Centre du joueur (40px/2)
        const playerCenterY = this.player.pixelY + 20;
        // Position de grille la plus proche du centre du joueur
        const gridR = Math.floor(playerCenterY / this.cellSize);
        const gridC = Math.floor(playerCenterX / this.cellSize);

        if (gridC === c && gridR === r) {

            if (['speed', 'flame', 'powerUp'].includes(bonusType)) {
               // const player = this.playerPositions.find(p => p.id === this.player.id);

                if (this.player) {

                    // Appliquer l'effet du bonus
                    switch (bonusType) {
                        case 'speed':
                            this.player.stats.speed = Math.min(this.player.stats.speed + 2, 8); // Incréments de 3
                            break;
                        case 'flame':
                            this.player.stats.flameRange = Math.min(this.player.stats.flameRange + 1, 4); // Max 8
                            break;
                        case 'powerUp':
                            this.player.stats.maxBombs = Math.min(this.player.stats.maxBombs + 1, 3); // Max 10
                            break;
                    }

                    // Retirer le bonus de la carte
                    this.mapData[r][c] = 'empty';

                    if (this.bonuses) {
                        this.bonuses = this.bonuses.filter(b => !(b.r === r && b.c === c));
                    }
                }
            }
        }
    }
}