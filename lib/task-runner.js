const limit = require("simple-rate-limiter");
const requestTags = limit(require("request")).to(4).per(1000);

const Tasks = require('./tasks');
const gameUpsert = require('./game-upsert');
const socketManager = require('./socket-manager');

const TIMEOUT = 0;

function Execute() {
    Tasks.find()
        .then(tasks => {
            if (tasks.length === 0) {
                setTimeout(Execute, TIMEOUT);
                return;
            }

            console.log('Runner: executing', tasks.length, 'tasks');
            Promise.all(tasks.map(Tasks.remove))
                .then(() => console.log('Tasks removed'));


            tasks.forEach(task => {
                const url = `http://steamspy.com/api.php?request=appdetails&appid=${task.appID}`;
                requestTags(url, (error, response, body) => {
                    if (error) return console.log('Runner error:', error.message);

                    const { statusCode } = response.toJSON();
                    if (statusCode === 503) return console.log('Runner error:', appID, 'rate limit exceeded');


                    const { appid, tags: { Multiplayer = false } } = JSON.parse(body);
                    const { appID, name, storeLink, logo, clientID } = task;
                    gameUpsert({ appID, name, storeLink, logo, multiplayer: Multiplayer })

                    const queueData = Multiplayer !== false
                        ? { appID, name, storeLink, logo }
                        : false;
                    socketManager.emit({
                        id: clientID, event: 'queueData', data: queueData
                    });
                });
            });

            setTimeout(Execute, TIMEOUT);
            return;
        })
}

module.exports = () => Execute();