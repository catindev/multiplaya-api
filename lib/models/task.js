const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const taskSchema = new Schema({
    "appID": String,
    "name": String,
    "logo": String,
    "storeLink": String,
    "clientID": String
});

module.exports = mongoose.model('Task', taskSchema);