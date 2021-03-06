
const taskRunner = require('./lib/task-runner');
// const Filter = require('./lib/local-filter');
const Filter = require('./lib/filter-by-db');
const socketManager = require('./lib/socket-manager');

const mongoose = require("mongoose");
mongoose.Promise = Promise;
mongoose.connect('mongodb://muser:111@ds129031.mlab.com:29031/multiplaya');

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get("/", (request, response) => response.json({
    about: 'Multiplaya API',
    currentVersion: 2
}));

app.get("/connected", (request, response) => response.json(socketManager.list));

io.on('connection', function (socket) {
    const rid = socket.id;
    socketManager.connect({ socket: socket });
    socket.emit('welcome', { id: rid });

    const filterByDB = Filter(rid);

    socket.on('disconnect', function () {
        socketManager.disconnect({ id: rid });
    });

    socket.on('fetch', function ({ profiles }) {
        console.log(`🦄 ${rid} /request`, profiles);
        filterByDB(profiles)
            .then(results => {
                console.log(`😊 ${rid} responsed`);
                socketManager.emit({
                    id: rid, event: 'response',
                    data: results
                })
            })
            .catch(error => {
                console.log(`💩 ${rid} error`);
                console.log(error);
                socketManager.emit({
                    id: rid, event: 'ooops',
                    data: error.message
                });
            });
    });
});

http.listen(process.env.PORT || 9999, function () {
    taskRunner();
    console.log('listening on', process.env.PORT);
});