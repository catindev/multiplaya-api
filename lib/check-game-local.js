const Game = require("./models/game");
const newTask = require('./tasks').create;

module.exports = function checkGame({ appID }) {
    return Game.findOne({ appID })
        .then(game => game ? game.multiplayer : 'NeedToCheck')
        .catch(error => { throw error });
}