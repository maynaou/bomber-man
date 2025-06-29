import { Player } from "./player.js";
export class GenerateMapGame {
    constructor(rows, cols, playerIds, room, players, playerclass) {
        this.rows = rows;
        this.cols = cols;
        this.playerclass = playerclass
        this.players = players
        this.playerIds = playerIds;
        this.playerPositions = this.generatePlayerPositions();
        this.mapData = this.generateMapData();
        this.activeBombs = [];
        this.cellSize = 40;
        this.room = room;
        this.bonuses = [];
        this.targetblock = null

    }

    generatePlayerPositions() {
        const cornerPositions = [
            { r: 1, c: 1 },
            { r: 1, c: this.cols - 2 },
            { r: this.rows - 2, c: 1 },
            { r: this.rows - 2, c: this.cols - 2 },
        ];

        return this.playerIds.map((id, index) => {
            const player = this.players.find(p => p.id === id);
            const username = player ? player.username : `Player${index + 1}`;
            //  console.log("lives : ",getplayer.lives);

            return {
                username: username,
                id,
                r: cornerPositions[index].r,
                c: cornerPositions[index].c,
                pixelX: cornerPositions[index].c * 40,
                pixelY: cornerPositions[index].r * 40,
                direction: 'front',
                isAlive: true,
                lastBombCell: null,
                isDamaged: false,
                stats: {
                    speed: 15,
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

        if (direction === 'Space' || direction === ' ') {

            const hasBomb = this.placeBombs(playerId);

            if (!hasBomb) {

                const place_bombs = this.activeBombs.find(bomb => bomb.playerId === playerId);


                return {
                    success: true,
                    pixelX: place_bombs.pixelX,
                    pixelY: place_bombs.pixelY,
                    direction: player.direction,
                    action: 'bomb'
                };
            }

        }

        // const baseSpeed = 4; // Vitesse de base en pixels par frame
        // const speedMultiplier = player.stats.speed / 15; // Normaliser par rapport à la vitesse de base
        const moveSpeed = 4


        let newPixelX = currentPixelX;
        let newPixelY = currentPixelY;

        switch (direction) {
            case 'ArrowUp':
                player.direction = 'back';
                newPixelY = currentPixelY - moveSpeed;
                break;
            case 'ArrowRight':
                player.direction = 'right';
                newPixelX = currentPixelX + moveSpeed;
                break;
            case 'ArrowLeft':
                player.direction = 'left';
                newPixelX = currentPixelX - moveSpeed;
                break;
            case 'ArrowDown':
                player.direction = 'front';
                newPixelY = currentPixelY + moveSpeed;
                break;
            default:
                return null;
        }

        // newPixelX = Math.round(newPixelX / 2) * 2; // Contraindre à des multiples de 2
        // newPixelY = Math.round(newPixelY / 2) * 2;

        if (!this.isValidMove(newPixelX, newPixelY, 40, playerId)) {
            return null; // Invalid movement
        }

        const newGridR = Math.floor(newPixelY / this.cellSize);
        const newGridC = Math.floor(newPixelX / this.cellSize);



        if (newGridR >= 0 && newGridR < this.rows && newGridC >= 0 && newGridC < this.cols) {
            player.r = newGridR;
            player.c = newGridC;

            // Collecter les bonus
            this.collectBonus(playerId, newGridR, newGridC);
        }

        player.pixelX = newPixelX;
        player.pixelY = newPixelY;

        this.updateBombGracePeriod(playerId);

        return {
            success: true,
            action: 'move'
        };
    }

    isValidMove(pixelX, pixelY, playerSize = 32, playerId) {
        // console.log("pixelX : ", pixelX,"pixelY : ", pixelY);

        const topLeftGridR = Math.floor(pixelY / this.cellSize);
        const topLeftGridC = Math.floor(pixelX / this.cellSize);
        const bottomRightGridR = Math.floor((pixelY + playerSize - 1) / this.cellSize);
        const bottomRightGridC = Math.floor((pixelX + playerSize - 1) / this.cellSize);

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
                    if (bombHere.playerId === playerId && bombHere.canPassThrough) {
                        continue; // Permettre le passage
                    } else {
                        return false; // Bloquer
                    }
                }
            }
        }

        return true;
    }


    updateBombGracePeriod(playerId) {
        const player = this.playerPositions.find(p => p.id === playerId);
        if (!player || !player.lastBombCell) return;

        const bomb = this.activeBombs.find(
            b => b.playerId === playerId && b.canPassThrough
        );

        if (!bomb) return;

        const bombPixelX = bomb.c * this.cellSize;
        const bombPixelY = bomb.r * this.cellSize;

        const insideBombCell =
            player.pixelX < bombPixelX + this.cellSize &&
            player.pixelX + this.cellSize > bombPixelX &&
            player.pixelY < bombPixelY + this.cellSize &&
            player.pixelY + this.cellSize > bombPixelY;

        if (!insideBombCell) {
            bomb.canPassThrough = false;
            player.lastBombCell = null;
        }
    }

    placeBombs(playerId) {
        const hasBomb = this.activeBombs.some(bomb => bomb.playerId === playerId);
        if (!hasBomb) {

            const player = this.playerPositions.find(p => p.id === playerId);
            if (!player) return true;

            // Calculer la position de grille basée sur les pixels du centre du joueur
            const playerCenterX = player.pixelX + 20; // Centre du joueur (40px/2)
            const playerCenterY = player.pixelY + 20;

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
                    playerId,
                    canPassThrough: true,
                    pixelX: gridC * this.cellSize,
                    pixelY: gridR * this.cellSize
                });
                player.lastBombCell = { r: gridR, c: gridC };
            }



            setTimeout(() => {
                this.room.broadcast({
                    type: 'bomb_exploded',
                    r: gridR * this.cellSize, // Coordonnées en pixels pour l'affichage
                    c: gridC * this.cellSize
                });
                this.explodeBomb(gridR, gridC, playerId);

                this.handleExplosionDamage(gridR, gridC,playerId)
                this.room.handleBombExplosion()
            }, 4000);

            setTimeout(() => {
                this.explodeBomb(gridR, gridC, playerId);
                this.room.handleBombExplosion()
            }, 4700);

        }

        return hasBomb

    }

  
handleExplosionDamage(bombR, bombC, playerId) {
    const bomberPlayer = this.playerPositions.find(p => p.id === playerId);
    const flameRange = bomberPlayer ? bomberPlayer.stats.flameRange : 1;

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
        const getplayer = Player.getPlayerStatusById(playerId)
        const player = this.playerPositions.find(p => p.id === playerId);
        //    console.log(getplayer.lives ,player.isAlive);
        if (!player || !player.isAlive) return;

        // console.log(this.playerclass.lives);

        //console.log(`Player ${player.username}`);
        this.playerclass.loseLife(playerId)
        const isAlive = getplayer.lives > 1 ? true : false
        player.isAlive = isAlive

        // console.log(getplayer.lives ,player.isAlive);
        //console.log("player isAlive : ", isAlive);

        if (!isAlive) {
            // Le joueur est mort, le marquer comme tel
            //console.log('--------------------------------------------');
            player.isDamaged = true
            // Broadcast la mort du joueur
            this.room.broadcast({
                type: 'player_died',
                playerId: playerId,
                username: player.username,
                lives: 0,
                playerPositions: this.playerPositions,
                mapData: this.mapData
            });

            // Retirer le joueur après un délai pour l'animation de mort
            setTimeout(() => {
                this.removeDeadPlayer(playerId);
            }, 1500); // 2 secondes pour l'animation de mort

        } else {
            // ✅ AJOUT: Marquer le joueur comme endommagé
            player.isDamaged = true;

            // ✅ AJOUT: Retirer l'état de dégât après l'animation
            setTimeout(() => {
                player.isDamaged = false;
                // Broadcast pour mettre à jour l'affichage
                this.room.broadcast({
                    type: 'player_damage_end',
                    playerId: playerId,
                    username: player.username,
                    playerPositions: this.playerPositions,
                    mapData: this.mapData
                });
            }, 3000); // Animation de 1.5 secondes

            // Broadcast immediate damage
            this.room.broadcast({
                type: 'player_damaged',
                playerId: playerId,
                username: player.username,
                lives: this.playerclass.lives,
                playerPositions: this.playerPositions,
                mapData: this.mapData
            });
        }
    }

    removeDeadPlayer(playerId) {
        // Retirer le joueur de la liste des positions
        this.playerPositions = this.playerPositions.filter(player => player.id !== playerId);

        // Retirer toutes les bombes de ce joueur
        this.activeBombs = this.activeBombs.filter(bomb => bomb.playerId !== playerId);

        // Retirer l'ID du joueur de la liste des joueurs actifs
        this.playerIds = this.playerIds.filter(id => id !== playerId);

        console.log(`Player ${playerId} has been removed from the game`);

        // Broadcast pour informer tous les clients
        this.room.broadcast({
            type: 'player_eliminated',
            playerId: playerId,
            playerPositions: this.playerPositions,
            activePlayers: this.playerIds.length,
            mapData: this.mapData
        });

        // Vérifier s'il reste assez de joueurs pour continuer le jeu
        // this.checkGameEnd();
    }

    explodeBomb(r, c, playerId) {
        this.activeBombs = this.activeBombs.filter(b => !(b.r === r && b.c === c));
        const player = this.playerPositions.find(p => p.id === playerId);

        // Fonction pour générer un bonus aléatoire
        const generateRandomBonus = () => {
            const bonusTypes = ['speed', 'flame', 'powerUp'];
            const bonusChance = 0.8; // 30% de chance d'obtenir un bonus

            if (Math.random() < bonusChance) {
                return bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
            }
            return null;
        };

        // Gestion de la case centrale de l'explosion
        if (this.mapData[r][c] === 'cutted') {
            this.mapData[r][c] = 'empty';
        } else if (this.mapData[r][c] === 'empty') {
            this.mapData[r][c] = 'cutted';
        }

        const directions = [
            { dr: -1, dc: 0 }, // haut
            { dr: 1, dc: 0 },  // bas
            { dr: 0, dc: -1 }, // gauche
            { dr: 0, dc: 1 }   // droite
        ];
        


        for (const { dr, dc } of directions) {
            for (let step = 1; step <= player.stats.flameRange; step++) {
                const nr = r + (dr * step);
                const nc = c + (dc * step);
                const hasBonus = this.bonuses ? this.bonuses.find(b => b.r === nr && b.c === nc) : null;
                

                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const target = this.mapData[nr][nc];
                    if (target === 'wall') break
                    if (target === 'block') {
                        // Quand un bloc est détruit, chance d'obtenir un bonus
                        const bonus = generateRandomBonus();
                        if (!this.bonuses) {
                            this.bonuses = [];
                        }

                        this.bonuses.push({
                            r: nr,
                            c: nc,
                            type: bonus,
                            timestamp: Date.now(),
                            shouldRestore: true
                        });

                        this.mapData[nr][nc] = 'cutted';
                    } else if (target === 'empty') {
                        this.mapData[nr][nc] = 'cutted';
                    } else if (['flame'].includes(target) && !hasBonus.shouldRestore) {
                        // Si c'est déjà un bonus, le laisser tel quel mais passer à cutted temporairement
                        this.mapData[nr][nc] = 'cutted';
                        // Marquer que ce bonus doit être restauré
                        if (hasBonus) {
                            hasBonus.shouldRestore = true;
                        }
                    } else if (target === 'cutted') {
                        // const hasBonus = this.bonuses?.find(b => b.r === nr && b.c === nc);

                        if (hasBonus && hasBonus.shouldRestore) {
                            this.mapData[nr][nc] = hasBonus.type;
                            hasBonus.shouldRestore = false;
                        } else {
                            this.mapData[nr][nc] = 'empty';
                        }
                    }else {
                         this.mapData[nr][nc] = 'cutted';
                    }
                    // Les bonus existants ne sont pas affectés par l'explosion
                }
            }
        }
        // Les bonus existants ne sont pas affectés par l'explosion
    }

    // Fonction pour collecter un bonus quand un joueur marche dessus
    collectBonus(playerId, r, c) {
        const bonusType = this.mapData[r][c];

        if (['speed', 'flame', 'powerUp'].includes(bonusType)) {
            const player = this.playerPositions.find(p => p.id === playerId);

            if (player) {
                // Initialiser les stats du joueur si elles n'existent pas


                // Appliquer l'effet du bonus
                switch (bonusType) {
                    case 'speed':
                        player.stats.speed = Math.min(player.stats.speed + 3, 30); // Incréments de 3
                        break;
                    case 'flame':
                        player.stats.flameRange = Math.min(player.stats.flameRange + 1, 8); // Max 8
                        break;
                    case 'powerUp':
                        player.stats.maxBombs = Math.min(player.stats.maxBombs + 1, 10); // Max 10
                        break;
                }

                // Retirer le bonus de la carte
                this.mapData[r][c] = 'empty';

                // Retirer le bonus de la liste des bonus (si vous utilisez cette approche)
                if (this.bonuses) {
                    this.bonuses = this.bonuses.filter(b => !(b.r === r && b.c === c));
                }

                // return {
                //     collected: true,
                //     bonusType: bonusType,
                //     newStats: player.stats
                // };
            }
        }
    }

    // Fonction utilitaire pour nettoyer les bonus expirés (optionnel)
    cleanExpiredBonuses(maxAge = 30000) { // 30 secondes par défaut
        if (!this.bonuses) return;

        const now = Date.now();
        const expiredBonuses = this.bonuses.filter(b => now - b.timestamp > maxAge);

        // Retirer les bonus expirés de la carte
        expiredBonuses.forEach(bonus => {
            if (this.mapData[bonus.r][bonus.c] === bonus.type) {
                this.mapData[bonus.r][bonus.c] = 'empty';
            }
        });

        // Retirer les bonus expirés de la liste
        this.bonuses = this.bonuses.filter(b => now - b.timestamp <= maxAge);
    }

}
