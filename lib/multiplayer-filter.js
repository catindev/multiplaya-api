const fetch = require('node-fetch');

function find(elems, callback, inv) {
    for (let i = 0, length = elems.length; i < length; i++) {
        if (!inv !== !callback(elems[i], i)) return elems[i];
    }
    return false;
}

const getCategories = data => ((data || {}).data || {}).categories || {};

const isMultiplayerCategory = category => category.id === 1 || category.id === 36 || category.id === 38;

function isMultiplayerGame(appID) {
    return fetch(`http://store.steampowered.com/api/appdetails/?appids=${appID}&filters=categories`)
        .then(response => response.json())
        .then(data => {
            if (data[appID].success === false) return false;
            return find(getCategories(data[appID]), isMultiplayerCategory);
        });
}

module.exports = function filterMultiplayerGames(gamesList) {
    if (!gamesList || gamesList.length === 0) return [];
    const ids = gamesList.map(({ appID }) => appID);
    const pipeline = ids.map(game => isMultiplayerGame(game));
    return Promise.all(pipeline)
        .then(results => results.map((result, index) => result && gamesList[index]))
        .then(games => games.filter(p => !!p));
}
