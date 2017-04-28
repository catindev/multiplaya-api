const findGames = require('./lib/find-games');
const multiplayerFilter = require('./lib/multiplayer-filter');

const express = require('express');
const app = express();
const cors = require('cors');
const apicache = require('apicache');
const cache = apicache.middleware;

app.use(cors());
app.use(cache('5 minutes'));

app.get("/v1/", (request, response) => {
  const { dudes } = request.query;
  const arrayOfDudes = dudes.split(',');
  
  if (arrayOfDudes.length <= 1) return response
    .status(400)
    .json({ error:400, message: 'Invalid dudes list'});
  
  findGames(dudes.split(','))
    .then(multiplayerFilter)
    .then(games => response.json(games))
});

app.get("/", (request, response) => response.json({ 
  about: 'Multiplaya API',
  currentVersion: 1
}));

const listener = app.listen(
  process.env.PORT, 
  () => console.log('Your app is listening on port ' + listener.address().port)
);
