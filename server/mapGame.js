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
                isDamaged : false
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


        const oldGridR = Math.floor(currentPixelY / this.cellSize);
        const oldGridC = Math.floor(currentPixelX / this.cellSize);

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

        const moveSpeed = 4;


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

        if (!this.isValidMove(newPixelX, newPixelY, 40, playerId)) {
            return null; // Invalid movement
        }

        const newGridR = Math.floor(newPixelY / this.cellSize);
        const newGridC = Math.floor(newPixelX / this.cellSize);

        player.r = newGridR;
        player.c = newGridC;
        player.pixelX = newPixelX;
        player.pixelY = newPixelY;

        this.updateBombGracePeriod(playerId);

        return {
            success: true,
            action: 'move'
        };
    }

    isValidMove(pixelX, pixelY, playerSize = 40, playerId) {
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

    placeBombs( playerId) {
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
            

                 player.lastBombCell = { r: gridR, c: gridC };            }



            setTimeout(() => {
                this.room.broadcast({
                    type: 'bomb_exploded',
                    r: gridR * this.cellSize, // Coordonnées en pixels pour l'affichage
                    c: gridC * this.cellSize
                });
                this.explodeBomb(gridR, gridC, playerId);

                this.handleExplosionDamage(gridR,gridC)
                this.room.handleBombExplosion()
            }, 4000);

            setTimeout(() => {
                this.explodeBomb(gridR, gridC, playerId);
                this.room.handleBombExplosion()
            }, 4700);

        }

        return hasBomb

    }

     handleExplosionDamage(bombR, bombC) {
     // Check if any player is at the bomb location
     this.checkPlayerDamage(bombR, bombC);

     // Check explosion in all 4 directions
     const directions = [
         { dr: -1, dc: 0 }, // up
         { dr: 1, dc: 0 },  // down
         { dr: 0, dc: -1 }, // left
         { dr: 0, dc: 1 }   // right
     ];

     for (const { dr, dc } of directions) {
         const nr = bombR + dr;
         const nc = bombC + dc;

         if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
             this.checkPlayerDamage(nr, nc);
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

    this.playerclass.lives--;
    console.log(`Player ${player.username} hit! Lives remaining: ${this.playerclass.lives}`);

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
            mapData :this.mapData
        });
    }, 1500); // Animation de 1.5 secondes

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

    explodeBomb(r, c, playerId) {
        this.activeBombs = this.activeBombs.filter(b => !(b.r === r && b.c === c));
        const player = this.playerPositions.find(p => p.id === playerId);

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
            const nr = r + dr;
            const nc = c + dc;

            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                const target = this.mapData[nr][nc];
                if (target === 'block') {
                    this.mapData[nr][nc] = 'cutted';
                } else if (target === 'empty') {
                    this.mapData[nr][nc] = 'cutted';
                } else if (target === 'cutted') {
                    this.mapData[nr][nc] = 'empty';
                }
            }
        }
    }

}
