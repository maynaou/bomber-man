export class GenerateMapGame {
    constructor(rows, cols, playerIds, room, players,playerclass) {
        this.rows = rows;
        this.cols = cols;
        this.playerclass = playerclass
        this.players = players
        this.playerIds = playerIds;
        this.playerPositions = this.generatePlayerPositions();
        this.mapData = this.generateMapData();
        this.activeBombs = [];
        this.cellSize = 40; // Taille d'une cellule en pixels
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
            // Find the player object that matches this ID
            const player = this.players.find(p => p.id === id);
            const username = player ? player.username : `Player${index + 1}`; // Fallback name

            //console.log(pixelX,pixelY,this.cellSize,cornerPositions[index].c);
            
            return {
                username: username,
                id,
                r: cornerPositions[index].r,
                c: cornerPositions[index].c,
                pixelX: cornerPositions[index].c * 40, // Position en pixels X
                pixelY: cornerPositions[index].r * 40, // Position en pixels Y
                direction: 'front',
                isAlive : true,
                lastBombCell: null
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

    // ✅ NOUVELLE MÉTHODE: Mouvement en pixels avec validation
    movePlayerByPixels(currentPixelX, currentPixelY, direction, playerId) {
        const player = this.playerPositions.find(p => p.id === playerId);
        if (!player) return null;

        // console.log("currentPixelX:", currentPixelX, "currentPixelY:", currentPixelY);

        // Convert current pixels to grid coordinates
        const oldGridR = Math.floor(currentPixelY / this.cellSize);
        const oldGridC = Math.floor(currentPixelX / this.cellSize);

        // Place bomb if space key is pressed
        if (direction === 'Space' || direction === ' ') {
            console.log(oldGridR, oldGridC);

            const hasBomb = this.placeBombs(oldGridR, oldGridC, oldGridR*this.cellSize,oldGridC*this.cellSize, playerId);

            // ✅ CORRECTION: Mettre à jour la carte après avoir placé la bombe
            if (!hasBomb) {
                //this.updateMapData();

                return {
                    success: true,
                    pixelX: oldGridC*this.cellSize,
                    pixelY: oldGridR*this.cellSize,
                    direction: player.direction,
                    action: 'bomb'
                };
            }

        }

        const moveSpeed = 4; // Convert to pixels per second


        // Calculate new pixel positions
        let newPixelX = currentPixelX;
        let newPixelY = currentPixelY;

        // Update direction and calculate new positions
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
                return null; // Invalid direction
        }

        if (!this.isValidMove(newPixelX, newPixelY, 40, playerId)) {
           // console.log("Movement blocked - staying at current position");
            return null; // Invalid movement
        }

        // Convert new pixel positions to grid coordinates
        const newGridR = Math.floor(newPixelY / this.cellSize);
        const newGridC = Math.floor(newPixelX / this.cellSize);

        //console.log(direction, "newGridR:", newGridR, "newGridC:", newGridC, "oldGridR:", oldGridR, "oldGridC:", oldGridC);   

        // VALIDATION SUPPLÉMENTAIRE : Vérifier les limites en pixels

        // Update player position
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

    // Fixed validation method
    isValidMove(pixelX, pixelY, playerSize = 40, playerId) {
        // Vérifier les limites de la carte en pixels

        // Calculer quelles cases la hitbox du joueur touche
        const topLeftGridR = Math.floor(pixelY / this.cellSize);
        const topLeftGridC = Math.floor(pixelX / this.cellSize);
        const bottomRightGridR = Math.floor((pixelY + playerSize - 1) / this.cellSize);
        const bottomRightGridC = Math.floor((pixelX + playerSize - 1) / this.cellSize);

        // console.log(`Joueur occupe cases: (${topLeftGridR},${topLeftGridC}) à (${bottomRightGridR},${bottomRightGridC})`);

        // Vérifier toutes les cases que le joueur touche
        for (let r = topLeftGridR; r <= bottomRightGridR; r++) {
            for (let c = topLeftGridC; c <= bottomRightGridC; c++) {
                if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
                    return false; // Hors limites
                }

                const cellType = this.mapData[r][c];

                // Bloquer sur murs et blocs
                if (cellType === 'wall' || cellType === 'block') {
                    //console.log(`Collision avec ${cellType} à (${r},${c})`);
                    return false;
                }

               // const isPlayerMove = this.isPlayerMoveBomb(r,c) 

                const bombHere = this.activeBombs.find(b => b.r === r && b.c === c);
                if (bombHere) {
                    //console.log(`💣 Bombe trouvée à (${r},${c}):`, bombHere);

                    // Si c'est la bombe du joueur ET qu'elle peut être traversée
                    if (bombHere.playerId === playerId && bombHere.canPassThrough) {
                        //console.log("✅ Période de grâce - joueur peut passer");
                        continue; // Permettre le passage
                    } else {
                        //console.log("❌ Bombe bloque le mouvement");
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

    // 🔍 Calculer les pixels de la case de la bombe
    const bombPixelX = bomb.c * this.cellSize;
    const bombPixelY = bomb.r * this.cellSize;

    // Si le joueur est encore dans cette zone (même partiellement), ne rien faire
    const insideBombCell =
        player.pixelX < bombPixelX + this.cellSize &&
        player.pixelX + this.cellSize > bombPixelX &&
        player.pixelY < bombPixelY + this.cellSize &&
        player.pixelY + this.cellSize > bombPixelY;

    if (!insideBombCell) {
        bomb.canPassThrough = false;
        player.lastBombCell = null;
        // console.log(`⛔️ Player ${playerId} moved off bomb cell completely, grace period ended`);
    }
}

// updateMapData() {
//     // Nettoyer d'abord toutes les cellules joueurs
//     for (let r = 0; r < this.rows; r++) {
//         for (let c = 0; c < this.cols; c++) {
//             if (this.mapData[r][c].startsWith('player')) {
//                 this.mapData[r][c] = 'empty';
//             }
//         }
//     }
    
//     this.playerPositions.forEach(player => {
//         this.mapData[player.r][player.c] = `player ${player.username} ${player.direction}`;
//     });
// }


    placeBombs(r, c, currentPixelY, currentPixelX, playerId) {
        const hasBomb = this.activeBombs.some(bomb => bomb.playerId === playerId);
        if (!hasBomb) {
            this.activeBombs.push({ r, c, playerId, canPassThrough: true });
            //this.updateMapData();
             const player = this.playerPositions.find(p => p.id === playerId);
             if (player) {
                player.lastBombCell = { r, c }; // 🔒 mémoriser la cellule de la bombe
             }

         

            setTimeout(() => {
                 this.room.broadcast({
                    type: 'bomb_exploded',
                    r: currentPixelY,
                    c: currentPixelX,
                  });
                this.explodeBomb(r, c,playerId);

                this.handleExplosionDamage(r,c)
                this.room.handleBombExplosion()
            }, 4000);

            setTimeout(() => {
                this.explodeBomb(r, c,playerId);
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

        // Broadcast life update to all clients
        // this.room.broadcast({
        //     type: 'player_life_updated',
        //     playerId: playerId,
        //     username: player.username,
        //     lives: player.lives
        // });

        // if (player.lives <= 0) {
        //     player.isAlive = false;
        //     console.log(`Player ${player.username} eliminated!`);
            
        //     // Broadcast player elimination
        //     this.room.broadcast({
        //         type: 'player_eliminated',
        //         playerId: playerId,
        //         username: player.username
        //     });

        //     // Check if game should end
        //     this.checkGameEnd();
        }

    explodeBomb(r, c,playerId) {
        this.activeBombs = this.activeBombs.filter(b => !(b.r === r && b.c === c));
                     const player = this.playerPositions.find(p => p.id === playerId);
       
         //console.log("--------------------------------------------",this.mapData[r][c],this.mapData[player.r][player.c]);

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
