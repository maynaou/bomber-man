
export class GenerateMapGame {
    constructor(rows, cols, playerIds) {
        this.rows = rows;
        this.cols = cols;
        this.playerIds = playerIds; // Liste des IDs ex: ['player1', 'player2']
        this.playerPositions = this.generatePlayerPositions();
        this.mapData = this.generateMapData()
        this.activeBombs = []
        this.width = 40
        this.height = 40
        // this.data = null
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
            c: cornerPositions[index].c,
            direction: 'front'
        }));
    }

    // Méthode pour générer les données de la carte (sans DOM)
    generateMapData() {
        const mapData = [];

        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                let cellType = 'empty';
                const playerHere = this.playerPositions.find(p => p.r === r && p.c === c);
                // Murs fixes sur les bords
                if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
                    cellType = 'wall';
                }
                // Murs fixes internes (tous les 2 cases en damier)
                else if (r % 2 === 0 && c % 2 === 0) {
                    cellType = 'wall';
                }

                else if (playerHere) {
                    cellType = `player ${playerHere.direction}`;

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

    moveplayer(direction, playerid) {

        const player = this.playerPositions.find(p => p.id === playerid)

        const oldR = player.r;
        const oldC = player.c;
        let newR = oldR;
        let newC = oldC;


        switch (direction) {
            case 'ArrowUp':
                newR = player.r - 1
                player.direction = 'back'
                break;
            case 'ArrowRight':
                newC = player.c + 1
                player.direction = 'right'
                break;
            case 'ArrowLeft':
                newC = player.c - 1
                player.direction = 'left'
                break;
            case 'ArrowDown':
                newR = player.r + 1
                player.direction = 'front'
                break;
            case 'Space':
                this.placeBombs(player.r, player.c)
                break
        }

        const targetCell = this.mapData[newR][newC];
        
        if (targetCell === 'empty') {
            player.r = newR;
            player.c = newC;

            const hasBombAtOldPos = this.activeBombs.some(bomb => bomb.r === oldR && bomb.c === oldC);
            
            if (hasBombAtOldPos) {
                console.log("hasBombAtOldPos : ",hasBombAtOldPos);
                this.mapData[oldR][oldC] = 'bombs';
            } else {
                this.mapData[oldR][oldC] = 'empty';
            }
            this.mapData[newR][newC] = `player ${player.direction}`;
        }

        return this.mapData
    }


   placeBombs(r, c) {
    const hasBomb = this.activeBombs.some(bomb => bomb.r === r && bomb.c === c);
        if (this.mapData[r][c].includes('player') && !hasBomb) {
        const bomb = {
            r: r,
            c: c,
            timer: 500, 
            placed: Date.now()
        };

        this.activeBombs.push(bomb);
        
        setTimeout(() => {
            this.explodeBomb(r, c);
        }, 2000);
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
                this.mapData[nr][nc] = 'empty';
            } else if (target === 'bombs') {
                this.explodeBomb(nr, nc);
            }
        }
    }
}


}