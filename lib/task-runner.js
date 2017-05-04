const limit = require("simple-rate-limiter");
const request = require('request-promise');

const Tasks = require('./tasks');
const gameUpsert = require('./game-upsert');
const socketManager = require('./socket-manager');

const TIMEOUT = 1000;

function Execute() {
    Tasks.find()
        .then(tasks => {
            if (tasks.length === 0) {
                setTimeout(Execute, TIMEOUT);
                return;
            }

            console.log('Runner: executing', tasks.length, 'tasks');
            Promise.all(tasks.map(Tasks.remove))
                .then(() => console.log('Runner:', tasks.length, 'tasks removed'));


            Promise.all(tasks.map(task => {
                console.log('start steamspy for', task.clientID)
                return request(`http://steamspy.com/api.php?request=appdetails&appid=${task.appID}`)
            }))
                .then(tasksResults => tasksResults.map((result, index) => {
                    const json = JSON.parse(result);
                    const { tags: { Multiplayer } } = json;
                    const { appID, name, logo, storeLink, clientID } = tasks[index];
                    const multiplayer = Multiplayer ? true : false;
                    return { clientID, appID, name, logo, storeLink, multiplayer };
                }))
                .then(games => {
                    console.log('Runner: sending results for', games.length, 'tasks');
                    games.forEach(({ clientID, appID, name, logo, storeLink, multiplayer }) => {
                        gameUpsert({ appID, name, storeLink, logo, multiplayer })
                        socketManager.emit({
                            id: clientID, event: 'queue', data: {
                                game: multiplayer === true
                                    ? { appID, name, logo, storeLink, multiplayer }
                                    : false
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log(error.stack);
                });

            setTimeout(Execute, TIMEOUT);
            return;
        })
}

module.exports = () => Execute();