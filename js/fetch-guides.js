#!/usr/bin/env node
// Fetches all guide data from the Rexby GraphQL API.
// Used by the GitHub Action to keep data fresh.
// Usage: node js/fetch-guides.js

var fs = require('fs');
var path = require('path');

var API = 'https://api.prod.rexby.com/graphql';
var DATA_DIR = path.join(__dirname, '..', 'data');
var GUIDES_FILE = path.join(DATA_DIR, 'guides.json');
var BATCH_SIZE = 20;

var QUERY = [
  'query($id: UUID!) { thingToDo(thingToDoId: $id, bypassFreemium: true) {',
  'id title slug description isOpen isSecret isTopFavorited',
  'primaryCategory secondaryCategories categoryClass { name }',
  'duration estimatedPrice { currency amount }',
  '... on UnlockedThingToDo { location { lat lng: long } locationName address website regionNames',
  'detail { ... on ActivityDetail { activityLevel seasonality ageRequirement } } }',
  'media { ... on Image { __typename id url order }',
  '... on Video { __typename id order mp4Url webmUrl muted thumbnail { url } poster { url } } }',
  '} }'
].join(' ');

async function gql(query, variables) {
  var res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: query, variables: variables || {} })
  });
  var json = await res.json();
  if (json.errors) throw new Error(json.errors.map(function(e) { return e.message; }).join('; '));
  return json.data;
}

async function fetchGuide(guideId) {
  console.log('Fetching guide ' + guideId + '...');

  // Get all item IDs
  var listData = await gql('query($guideId: UUID!) { thingsToDo(guideId: $guideId) { id } }', { guideId: guideId });
  var ids = listData.thingsToDo.map(function(t) { return t.id; });
  console.log('  Found ' + ids.length + ' items');

  // Batch fetch
  var results = [];
  for (var i = 0; i < ids.length; i += BATCH_SIZE) {
    var batch = ids.slice(i, i + BATCH_SIZE);
    var promises = batch.map(function(id) {
      return gql(QUERY, { id: id })
        .then(function(d) { return d.thingToDo; })
        .catch(function(err) { console.warn('  Failed to fetch ' + id + ': ' + err.message); return null; });
    });
    var batchResults = await Promise.all(promises);
    batchResults.forEach(function(r) { if (r) results.push(r); });
    process.stdout.write('  Fetched ' + results.length + '/' + ids.length + '\r');
  }
  console.log('  Fetched ' + results.length + '/' + ids.length + ' items');
  return results;
}

async function main() {
  var guides = JSON.parse(fs.readFileSync(GUIDES_FILE, 'utf8'));
  console.log('Found ' + guides.length + ' guides to fetch\n');

  for (var i = 0; i < guides.length; i++) {
    var guide = guides[i];
    var items = await fetchGuide(guide.id);
    var outFile = path.join(DATA_DIR, guide.id + '.json');
    fs.writeFileSync(outFile, JSON.stringify(items, null, 2));
    console.log('  Saved to ' + outFile + '\n');
  }

  console.log('Done!');
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
