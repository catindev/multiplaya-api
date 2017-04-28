const parser = require('xml2json');
const fetch = require('node-fetch');

const readGamesList = o => (((o || {}).gamesList || {}).games || {}).game || [];

const remap = ({ appID, name, logo }) => ({ appID, name, logo });

function getGamesByNickname(nick) {
    return fetch(`http://steamcommunity.com/id/${nick}/games?tab=all&xml=1`)
        .then(response => response.text())
        .then(xml => {
            const jsonData = JSON.parse(parser.toJson(xml));
            return readGamesList(jsonData);
        });
}

function getGames(players) {
    const pipeline = players.map(player => getGamesByNickname(player));
    return Promise.all(pipeline);
}

function findDublicates(source, another) {
    const toString = item => JSON.stringify(item);
    const stringsOfAnother = another.map(toString);
    const isDublicate = item => stringsOfAnother.indexOf(toString(item)) !== -1;
    return source.filter(isDublicate).filter(p => !!p);
}

const reduceGames = (heap, games) => {
    heap = heap.length > 0
        ? findDublicates(heap, games)
        : games;
    return heap;
};

module.exports = function gamesHeap(dudes) {
    return getGames(dudes).then(gamesList => gamesList.reduce(reduceGames, []))
}
