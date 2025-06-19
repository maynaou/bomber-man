
export class GenerateMapGame {
    constructor(rows, cols, playerCount) {
        this.rows = rows;
        this.cols = cols;
        this.playerCount = playerCount;
        // Positions des joueurs dans les coins
        this.playerPositions = this.generatePlayerPositions();
    }

          
    generatePlayerPositions() {      
        const positions = [];
        const cornerPositions = [
            { r: 1, c: 1 },
            { r: 1, c: this.cols - 2 },
            { r: this.rows - 2, c: 1 },
            { r: this.rows - 2, c: this.cols - 2 },
        ];

        for (let i = 0; i < this.playerCount; i++) {
            positions.push(cornerPositions[i]);
        }

        return positions;
    }


    // Méthode pour générer les données de la carte (sans DOM)
    generateMapData() {
        const mapData = [];
        
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                let cellType = 'empty';
                
                // Murs fixes sur les bords
                if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
                    cellType = 'wall';
                }
                // Murs fixes internes (tous les 2 cases en damier)
                else if (r % 2 === 0 && c % 2 === 0) {
                    cellType = 'wall';
                }
                // Position des joueurs : on laisse vide (zone sûre)
                else if (this.playerPositions.some(p => p.r === r && p.c === c)) {
                    cellType = 'player';
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
            mapData.push(row);
        }
        
        return mapData;
    }
    getPlayerPositions() {
        return this.playerPositions;
    }

    setPlayerIds(playerIds) {
    this.playerCurrentPositions = new Map();
    for (let i = 0; i < playerIds.length; i++) {
        const pos = this.playerPositions[i];
        this.playerCurrentPositions.set(playerIds[i], { r: pos.r, c: pos.c });
    }
    }

 }