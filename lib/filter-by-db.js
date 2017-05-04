const parser = require('xml2json');
const request = require('request-promise');

const Game = require("./models/game");
const Task = require("./models/task");

function onError(error) {
    if (error.profile) {
        console.log('profile', error);
        throw new Error(error.error);
    } else {
        console.log('common', error);
        throw error;
    }

}

module.exports = function (socketID) {
    return function localFilter(profiles) {

        // Get profile data
        return Promise.all(profiles.map(profile => {
            let profileName = profile, profileType = 'id';
            switch (true) {
                case profile.indexOf('steamcommunity.com') !== -1:
                    const splittedLink = profile
                        .replace('http://', '')
                        .replace('https://', '')
                        .split('/');
                    profileName = splittedLink[2];
                    profileType = splittedLink[1] === 'id' ? 'id' : 'profiles';
                    break;

                case /^\d+$/.test(profile) === true:
                    profileName = profile;
                    profileType = 'profiles';
                    break;
            };

            return request(`http://steamcommunity.com/${profileType}/${profileName}/games?tab=all&xml=1`)
                .then(response => JSON.parse(parser.toJson(response)))
                .catch(onError);
        }))

            // Validate profiles
            .then(steamProfiles => {
                steamProfiles.map((steamProfile, index) => {
                    function errorIt(error) {
                        return new Error(
                            `Uh, oh! Troubles with profile ${profiles[index]}. Seems like ${error}`
                        );
                    }

                    if (Object.keys(steamProfile).length === 0) throw errorIt('profile is invalid')

                    if (steamProfile.response !== undefined &&
                        steamProfile.response.error !== undefined)
                        throw errorIt('profile is invalid');

                    if (steamProfile.gamesList !== undefined &&
                        steamProfile.gamesList.error !== undefined)
                        throw errorIt('profile is private');

                    if (steamProfile.gamesList === undefined)
                        throw errorIt('profile without games');

                    const games = (((steamProfile || {}).gamesList || {}).games || {}).game || []
                    if (games.length === 0)
                        throw errorIt('profile without games');

                    return games.map(
                        ({ appID, name, logo, storeLink }) => ({ appID, name, logo, storeLink })
                    );
                })
            })

            // Collect common games
            .then(games => games.reduce((heap, another) => {
                if (heap.length === 0) return another;
                const stringsOfAnother = another.map(JSON.stringify);
                return heap
                    .filter(item => stringsOfAnother.indexOf(JSON.stringify(item)) !== -1)
                    .filter(p => !!p);
            }, []))

            .then(commonGames => {
                if (commonGames.length === 0) throw new Error('Common games not found');
                return commonGames;
            })

            // Check game via local DB
            .then(games => {
                return Promise.all(games.map(
                    game => Game.findOne({ appID: game.appID })
                        .then(game => game ? game.multiplayer : 'NeedToCheck')
                        .catch(onError)
                ))
                    .then(localGames => ({ games, localGames }))
                    .catch(onError);
            })


            // Register Steamspy tasks & filter local games 
            .then(({ games, localGames }) => {
                return Promise.all(
                    localGames.map((localGame, index) => {
                        if (localGame === 'NeedToCheck') {
                            const { appID, name, storeLink, logo } = games[index];
                            const newTask = new Task({
                                clientID: socketID,
                                appID, name, storeLink, logo
                            });
                            return newTask.save()
                                .then(task => task)
                                .catch(onError)
                        }
                    }).filter(p => !!p)
                ).then(tasks => ({
                    games: localGames
                        .map((isLocalGame, index) => isLocalGame === true && games[index])
                        .filter(p => !!p),
                    queue: tasks.length
                }))
            })
            .catch(error => { throw error; });
    }
};