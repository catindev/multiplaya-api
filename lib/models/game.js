const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const gameSchema = new Schema({
    "appID": String,
    "name": String,
    "logo": String,
    "storeLink": String,
    "multiplayer": Boolean
});

module.exports = mongoose.model('Game', gameSchema);