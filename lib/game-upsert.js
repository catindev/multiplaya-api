const Game = require("./models/game");

module.exports = function gameUpsert(data) {
    const { appID } = data;
    Game.findOne({ appID })
        .then(game => {
            if (!game) {
                const newGame = new Game(data);
                newGame.save()
                    .then(game => game)
                    .catch(error => { throw error });
            }
        })
        .catch(error => { throw error });
}