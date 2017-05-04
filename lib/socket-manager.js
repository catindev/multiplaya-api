const EventEmitter = require('events').EventEmitter;

class SocketManager extends EventEmitter {

    constructor() {
        super();
        this.connections = {};
        console.log('SocketManager started');
    }

    connect({ socket }) {
        this.connections[socket.id] = socket;
        console.log('🦄 ', socket.id, 'connected');
    }

    disconnect({ id }) {
        delete this.connections[id];
        console.log('🦄 ', id, 'disconnected');
    }

    get list() {
        return Object.keys(this.connections);
    }

    emit({ id, event, data = false, debug = false }) {
        if (!this.connections[id]) {
            console.log('😵 connection', id, 'not found');
            return;
        }
        this.connections[id].emit(event, data);
        debug === true && console.log(
            '👉 event', event,
            'emitted to', id,
            'with', data === false ? 'no data' : data
        );
    }
}

const manager = new SocketManager();

module.exports = manager;