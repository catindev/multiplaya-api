const EventEmitter = require('events').EventEmitter;

const request = require('request');
const parser = require('xml2json');

const limit = require("simple-rate-limiter");
const requestTags = limit(require("request")).to(4).per(1000);

const gameUpsert = require('./game-upsert');
const localCheck = require('./check-game-local');
const newTask = require('./tasks').create;

class Multiplaya extends EventEmitter {

    constructor(socketID) {
        super();
        this.socketID = socketID;
    }

    getCheckProfile(dude) {
        let dudeName = dude, dudeType = 'id';

        switch (true) {
            // URL
            case dude.indexOf('steamcommunity.com') !== -1:
                const splittedLink = dude
                    .replace('http://', '')
                    .replace('https://', '')
                    .split('/');
                dudeName = splittedLink[2];
                dudeType = splittedLink[1] === 'id' ? 'id' : 'profiles';
                break;
            // SteamID64    
            case /^\d+$/.test(dude) === true:
                dudeName = dude;
                dudeType = 'profiles';
                break;
        };

        return {
          name: dudeName,
          url: `http://steamcommunity.com/${dudeType}/${dudeName}/games?tab=all&xml=1`
        };
    }

    isProfileError(profile, data) {
        let error = false;

        // empty response
        if (Object.keys(data).length === 0) error = 'Invalid profile';
      
        if (data.gamesList === undefined) error = 'Games not found';

        // invalid profile id
        if (data.response !== undefined && data.response.error !== undefined) {
            error = 'Invalid profile';
        }

        // private profile
        if (data.gamesList !== undefined && data.gamesList.error !== undefined) {
            error = 'Private profile';
        }

        if (error !== false) {
            this.emit('profileError', { profile, error });
            return true;
        }
        return false;
    }

    getGames(dudes) {
        this.dudes = dudes;
        this.error = false;
        this.games = [];

        this.dudes.forEach((dude, index) => {
            if (this.error === true) return;

            const { url, name } = this.getCheckProfile(dude);
            request(url, (error, response, body) => {
                const responseData = JSON.parse(parser.toJson(body));
                this.error = this.isProfileError(name, responseData);
                if (this.error) return;

                this.games.push(
                    responseData.gamesList.games.game.map(
                        ({ appID, name, logo, storeLink }) => ({ appID, name, logo, storeLink })
                    )
                );

                console.log(':D profile ok', responseData.gamesList.steamID);

                if (this.games.length === this.dudes.length) {
                    // collect games & start filter
                    this.games = this.games.reduce((heap, another) => {
                        if (heap.length === 0) return another;
                        const stringsOfAnother = another.map(JSON.stringify);
                        return heap
                            .filter(item => stringsOfAnother.indexOf(JSON.stringify(item)) !== -1)
                            .filter(p => !!p);
                    }, []);
                    this.filterGames();
                }

            });
        });
        return this;
    }

    filterGames() {
        if (this.games.length === 0) {
            return this.emit('filterError', { message: 'common games not found' });
        }

        Promise.all(this.games.map(localCheck)).then(results => {

            // filter local games
            const checkedAsMultiplayerLocal = results
                .map((result, index) => result === true && this.games[index])
                .filter(p => !!p);

            if (checkedAsMultiplayerLocal.length > 0) {
                this.emit('localGames', checkedAsMultiplayerLocal);
            }

            if (checkedAsMultiplayerLocal.length === this.games.length) {
                return this.emit('filterFinish', { queue: 0 })
            }

            // register tasks for steamspy
            Promise.all(
                results.map((result, index) => {
                    if (result === 'NeedToCheck') {
                        const { appID, name, storeLink, logo } = this.games[index];
                        return newTask({
                            clientID: this.socketID, appID, name, storeLink, logo
                        });
                    }
                }).filter(p => !!p)
            ).then(tasks => {
                this.emit('filterFinish', { queue: tasks.length })
            });

        });
        return this;
    }
}

module.exports = Multiplaya;