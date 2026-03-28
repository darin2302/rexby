#!/usr/bin/env node
// Fetches guide data from the Rexby GraphQL API.
// Used by GitHub Actions to keep data fresh.
//
// Usage:
//   node js/fetch-guides.js          # Only fetch guides missing a data file
//   node js/fetch-guides.js --all    # Re-fetch all guides (used by monthly cron)

var fs = require('fs');
var path = require('path');

var API = 'https://api.prod.rexby.com/graphql';
var DATA_DIR = path.join(__dirname, '..', 'data');
var GUIDES_FILE = path.join(DATA_DIR, 'guides.json');
var BATCH_SIZE = 20;
var FORCE_ALL = process.argv.includes('--all');

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

var GUIDE_QUERY = 'query($id: UUID!) { guide(id: $id) { title locales creator { creatorName } } }';

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

async function fetchGuideInfo(guideId) {
  try {
    var data = await gql(GUIDE_QUERY, { id: guideId });
    return data.guide;
  } catch (e) {
    return null;
  }
}

async function fetchGuideItems(guideId) {
  console.log('Fetching guide ' + guideId + '...');

  var listData = await gql('query($guideId: UUID!) { thingsToDo(guideId: $guideId) { id } }', { guideId: guideId });
  var ids = listData.thingsToDo.map(function(t) { return t.id; });
  console.log('  Found ' + ids.length + ' items');

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
  var updated = false;

  for (var i = 0; i < guides.length; i++) {
    var guide = guides[i];
    var outFile = path.join(DATA_DIR, guide.id + '.json');
    var exists = fs.existsSync(outFile);
    var fileSize = exists ? fs.statSync(outFile).size : 0;

    // Skip only if file exists, has real data (>100 bytes), and not forcing refresh
    if (exists && fileSize > 100 && !FORCE_ALL) {
      console.log('Skipping ' + guide.id + ' (' + guide.title + ') — data file exists');
      continue;
    }

    // If guide entry is minimal (just an id), fill in title/creator from API
    if (!guide.title || guide.title === guide.id) {
      var info = await fetchGuideInfo(guide.id);
      if (info) {
        guide.title = info.title || guide.id;
        guide.creator = (info.creator && info.creator.creatorName) || guide.creator || 'Unknown';
        updated = true;
      }
    }

    var items = await fetchGuideItems(guide.id);
    fs.writeFileSync(outFile, JSON.stringify(items, null, 2));
    console.log('  Saved ' + items.length + ' items to ' + outFile + '\n');
  }

  // Save updated guides.json if we filled in any metadata
  if (updated) {
    fs.writeFileSync(GUIDES_FILE, JSON.stringify(guides, null, 2) + '\n');
    console.log('Updated guides.json with guide metadata');
  }

  console.log('Done!');
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
