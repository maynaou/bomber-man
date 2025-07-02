const lives = [];

export class Player {
  constructor(id, ws, username) {
    this.id = id;
    this.ws = ws;
    this.username = username;

    lives.push({ id: this.id, username: this.username, lives: 3 });
  }

   static getPlayerStatusById(id) {
   const player = lives.find(player => player.id === id);
    if (!player) return null;

    if (player && player.lives > 0) {
        player.lives--;   
    }

   return {
    id: player.id,
    username: player.username,
    lives: player.lives,
   };
   }

}
