// mapGame.js - Modifications pour gérer les mouvements en pixels

import { Room } from "./room.js";

export class GenerateMapGame {
    constructor(rows, cols, playerIds, room,players) {
        this.rows = rows;
        this.cols = cols;
        this.players= players
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
        
        return {
            username: username,
            id,
            r: cornerPositions[index].r,
            c: cornerPositions[index].c,
            pixelX: cornerPositions[index].c * this.cellSize, // Position en pixels X
            pixelY: cornerPositions[index].r * this.cellSize, // Position en pixels Y
            direction: 'front'
        };
    });
    }

    generateMapData() {
        const mapData = [];

        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                let cellType = 'empty';
                const playerHere = this.playerPositions.find(p => p.r === r && p.c === c);
                
                if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
                    cellType = 'wall';
                }
                else if (r % 2 === 0 && c % 2 === 0) {
                    cellType = 'wall';
                }
                else if (playerHere) {
                   // console.log("hhhhhhhhhhhhhhhhh",playerHere.username);
                    
                    cellType = `player ${playerHere.username} ${playerHere.direction}`;
                } else if (
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
    
    console.log("currentPixelX:", currentPixelX, "currentPixelY:", currentPixelY);
    
    // Convert current pixels to grid coordinates
    const oldGridR = Math.floor(currentPixelY / this.cellSize);
    const oldGridC = Math.floor(currentPixelX / this.cellSize);
    
    // Place bomb if space key is pressed
    if (direction === 'Space' || direction === ' ') {
        this.placeBombs(oldGridR, oldGridC);
        return {
            success: true,
            pixelX: currentPixelX,
            pixelY: currentPixelY,
            direction: player.direction,
            action: 'bomb'
        };
    }

    // Calculate new pixel positions
    let newPixelX = currentPixelX;
    let newPixelY = currentPixelY;

    // Update direction and calculate new positions
    switch (direction) {
        case 'ArrowUp':
            player.direction = 'back';
            newPixelY = currentPixelY - 4;
            break;
        case 'ArrowRight':
            player.direction = 'right';
            newPixelX = currentPixelX + 4;
            break;
        case 'ArrowLeft':
            player.direction = 'left';
            newPixelX = currentPixelX - 4;
            break;
        case 'ArrowDown':
            player.direction = 'front';
            newPixelY = currentPixelY + 4;
            break;
        default:
            return null; // Invalid direction
    }

     if (!this.isValidMove(newPixelX,newPixelY,40)) {
        console.log("Movement blocked - staying at current position");
        return null; // Invalid movement
    }

    // Convert new pixel positions to grid coordinates
    const newGridR = Math.floor(newPixelY / this.cellSize);
    const newGridC = Math.floor(newPixelX / this.cellSize);

    console.log(direction, "newGridR:", newGridR, "newGridC:", newGridC, "oldGridR:", oldGridR, "oldGridC:", oldGridC);   

    // VALIDATION SUPPLÉMENTAIRE : Vérifier les limites en pixels
    if (newPixelX < 0 || newPixelY < 0 || 
        newPixelX >= this.cols * this.cellSize || 
        newPixelY >= this.rows * this.cellSize) {
        console.log("Pixel boundaries exceeded");
        return null;
    }

    // Update player position
    player.r = newGridR;
    player.c = newGridC;
    player.pixelX = newPixelX;
    player.pixelY = newPixelY;

    // Update the map
    this.updateMapData();

    return {
        success: true,
        pixelX: newPixelX,
        pixelY: newPixelY,
        direction: player.direction,
        action: 'move'
    };
}

// Fixed validation method
isValidMove(pixelX, pixelY, playerSize = 40) {
    // Vérifier les limites de la carte en pixels
    if (pixelX < 0 || pixelY < 0 || 
        pixelX + playerSize > this.cols * this.cellSize || 
        pixelY + playerSize > this.rows * this.cellSize) {
        console.log("Hors limites de la carte");
        return false;
    }

    // Calculer quelles cases la hitbox du joueur touche
    const topLeftGridR = Math.floor(pixelY / this.cellSize);
    const topLeftGridC = Math.floor(pixelX / this.cellSize);
    const bottomRightGridR = Math.floor((pixelY + playerSize - 1) / this.cellSize);
    const bottomRightGridC = Math.floor((pixelX + playerSize - 1) / this.cellSize);

    console.log(`Joueur occupe cases: (${topLeftGridR},${topLeftGridC}) à (${bottomRightGridR},${bottomRightGridC})`);

    // Vérifier toutes les cases que le joueur touche
    for (let r = topLeftGridR; r <= bottomRightGridR; r++) {
        for (let c = topLeftGridC; c <= bottomRightGridC; c++) {
            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
                return false; // Hors limites
            }

            const cellType = this.mapData[r][c];
            
            // Bloquer sur murs et blocs
            if (cellType === 'wall' || cellType === 'block') {
                console.log(`Collision avec ${cellType} à (${r},${c})`);
                return false;
            }
        }
    }

    return true;
}

// The updateMapData method looks correct, but here's a slightly optimized version
updateMapData() {
    // Reset all player cells
    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            if (this.mapData[r][c].startsWith('player')) {
                // Check if there's a bomb at this position
                const hasBomb = this.activeBombs.some(bomb => bomb.r === r && bomb.c === c);
                this.mapData[r][c] = hasBomb ? 'bombs' : 'empty';
            }
        }
    }

    // Place all players on the map
    this.playerPositions.forEach(player => {
        const existingCell = this.mapData[player.r][player.c];
        if (existingCell === 'bombs') {
            // Keep the bomb but note player presence (you might want to handle this differently)
            this.mapData[player.r][player.c] = 'bombs';
        } else {
            this.mapData[player.r][player.c] = `player ${player.username} ${player.direction}`;
        }
    });
}
    // Méthode originale conservée pour compatibilité
    moveplayer(direction, playerid) {
        console.log("------------------------------------------------------------------");
        
        const player = this.playerPositions.find(p => p.id === playerid);
        if (!player) return this.mapData;

        const oldR = player.r;
        const oldC = player.c;
        let newR = oldR;
        let newC = oldC;

        switch (direction) {
            case 'ArrowUp':
                newR = player.r - 1;
                player.direction = 'back';
                break;
            case 'ArrowRight':
                newC = player.c + 1;
                player.direction = 'right';
                break;
            case 'ArrowLeft':
                newC = player.c - 1;
                player.direction = 'left';
                break;
            case 'ArrowDown':
                newR = player.r + 1;
                player.direction = 'front';
                break;
            case 'Space':
                this.placeBombs(player.r, player.c);
                return this.mapData;
        }

        if (this.isValidMove(newR, newC)) {
            player.r = newR;
            player.c = newC;
            player.pixelX = newC * this.cellSize;
            player.pixelY = newR * this.cellSize;
            this.updateMapData();
        }

        return this.mapData;
    }

    placeBombs(r, c) {
        const hasBomb = this.activeBombs.some(bomb => bomb.r === r && bomb.c === c);
        if (!hasBomb) {
            const bomb = {
                r: r,
                c: c,
                timer: 500,
                placed: Date.now()
            };

            this.activeBombs.push(bomb);
            
            setTimeout(() => {            
                this.explodeBomb(r, c);
                this.room.handleBombExplosion();
            }, 2000);

            setTimeout(() => {
                this.explodeBomb(r, c);
                this.room.handleBombExplosion();
            }, 2500);
        }
    }

    explodeBomb(r, c) {
        this.activeBombs = this.activeBombs.filter(b => !(b.r === r && b.c === c));

        if (this.mapData[r][c] === 'bombs') {
            const playerHere = this.playerPositions.find(p => p.r === r && p.c === c);
            if (playerHere) {
                this.mapData[r][c] = `player ${playerHere.direction}`;
            } else {
                this.mapData[r][c] = 'empty';
            }
        }

        if (this.mapData[r][c] === 'cutted') {
            this.mapData[r][c] = 'empty';
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
