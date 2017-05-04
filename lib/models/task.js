const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const taskSchema = new Schema({
    "appID": String,
    "name": String,
    "logo": String,
    "storeLink": String,
    "clientID": String,
    "created": { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);