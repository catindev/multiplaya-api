
const taskRunner = require('./lib/task-runner');
const Filter = require('./lib/local-filter');
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

    const localFilter = new Filter(rid);

    socket.on('disconnect', function () {
        socketManager.disconnect({ id: rid });
    });

    socket.on('fetch', function ({ dudes, id }) {
        localFilter
            .on('profileError', function ({ profile, error }) {
                socketManager.emit({
                    id: rid, event: 'profileError',
                    data: { profile, error }
                });
            })
            .on('localGames', function (games) {
                console.log('local games', games.length);
                socketManager.emit({
                    id: rid, event: 'response',
                    data: { items: games }
                });
            })
            .on('filterFinish', function ({ queue }) {
                socketManager.emit({
                    id: rid, event: 'finish', data: { queue }
                });
            });

        localFilter.getGames(dudes.split(','));
    });
});

http.listen(process.env.PORT, function () {
    taskRunner();
    console.log('listening on', process.env.PORT);
});