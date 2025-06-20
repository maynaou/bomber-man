
export class GenerateMapGame {
    constructor(rows, cols, playerIds) {
        this.rows = rows;
        this.cols = cols;
        this.playerIds = playerIds;
        // Positions des joueurs dans les coins
        this.playerPositions = this.generatePlayerPositions();

        this.mapData = null 
    }

          
    generatePlayerPositions() {      
        const cornerPositions = [
            { r: 1, c: 1 },
            { r: 1, c: this.cols - 2 },
            { r: this.rows - 2, c: 1 },
            { r: this.rows - 2, c: this.cols - 2 },
        ];
     return this.playerIds.map((id, index) => ({
            id,
            r: cornerPositions[index].r,
            c: cornerPositions[index].c
        }));
    }


    // Méthode pour générer les données de la carte (sans DOM)
    generateMapData() {
        this.mapData = []
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                let cellType = 'empty';
                const playerid = this.playerPositions.find(p => p.r === r && p.c === c)
                // Murs fixes sur les bords
                if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
                    cellType = 'wall';
                }
                // Murs fixes internes (tous les 2 cases en damier)
                else if (r % 2 === 0 && c % 2 === 0) {
                    cellType = 'wall';
                }
                // Position des joueurs : on laisse vide (zone sûre)
                else if (playerid) {
                    console.log(playerid);
                    
                    cellType = 'player' + playerid.id;
                    console.log(cellType);
                    
                }
                // Zone sûre autour des joueurs (on évite de mettre des blocs destructibles)
                else if (
                    this.playerPositions.some(p =>
                        Math.abs(p.r - r) <= 1 && Math.abs(p.c - c) <= 1
                    )
                ) {
                    cellType = 'empty';
                }
                // Sinon, placer un bloc destructible aléatoirement (50%)
                else {
                    if (Math.random() < 0.5) {
                        cellType = 'block';
                    }
                }
                
                row.push(cellType);
            }
            this.mapData.push(row);
        }
        
        return this.mapData;
    }
getPlayerPositions() {
        return this.playerPositions;
    }

    // NEW METHOD: Get specific player position
    getPlayerPosition(playerId) {
        return this.playerPositions.find(p => p.id === playerId);
    }

    // NEW METHOD: Check if a move is valid
    isValidMove(row, col) {

        
        
        // Check bounds
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return false;
        }

        // Check if cell is not a wall or block
        const cellType = this.mapData[row][col];
        if (cellType === 'wall' || cellType === 'block') {
            return false;
        }

        // Check if another player is already at this position
        const playerAtPosition = this.playerPositions.find(p => p.r === row && p.c === col);
        if (playerAtPosition) {
            return false;
        }
    console.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    
        return true;
    }

    // NEW METHOD: Update player position
    updatePlayerPosition(playerId, newRow, newCol) {

        
        
        const playerIndex = this.playerPositions.findIndex(p => p.id === playerId);
        console.log("------------------------------------------------------------------",playerIndex);
        if (playerIndex !== -1) {
            // Clear old position in map data
            const oldPos = this.playerPositions[playerIndex];
            this.mapData[oldPos.r][oldPos.c] = 'empty';
            
            // Update position
            this.playerPositions[playerIndex] = {
                id: playerId,
                r: newRow,
                c: newCol
            };
            
            // Set new position in map data
            this.mapData[newRow][newCol] = 'player' + playerId;
        }
    }

 }