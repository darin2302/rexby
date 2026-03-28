# Rexby GraphQL API Documentation

**Endpoint:** `https://api.prod.rexby.com/graphql` (Apollo Server, POST only)
**Auth:** No auth required for read queries (bypassFreemium: true works)

## CDN Image Resizing

Images from `cdn.prod.rexby.com` support query params for resizing:
```
https://cdn.prod.rexby.com/image/{id}?format=webp&width=384&height=288
```
Supported params: `format` (webp), `width`, `height`.

## Key Types

### ThingToDo
Base fields (available on all ThingToDo):
- `id` (UUID!, non-null)
- `title`, `slug`, `description` (ProseMirror JSON string)
- `isOpen`, `isSecret`, `isTopFavorited` (Boolean)
- `primaryCategory`, `secondaryCategories` (String / [String])
- `categoryClass` → `{ name }` (e.g. "Experience")
- `duration` (String enum: ExtremelyShort, Short, Medium, Long, ExtremelyLong, AllDay)
- `estimatedPrice` → `{ currency, amount }`
- `guideId`, `guide` → Guide object
- `media` → `[Media!]!` (union: Image | Video)
- `metadata` → ThingToDoMetadata (see note below)
- `affiliate` → union type

**UnlockedThingToDo** additional fields (inline fragment `... on UnlockedThingToDo`):
- `location` → `{ lat, lng: long }` (both String!, use `lng: long` alias)
- `locationName` (String) — human-readable place name
- `address` (String, nullable)
- `website` (String, nullable)
- `regionNames` ([String]) — e.g. ["Bulgaria", "Sofia City", "Stolichna"]
- `detail` → union, use `... on ActivityDetail { activityLevel, seasonality, ageRequirement }`
- `isFavorited`, `totalFavoritesByPlaceId`
- `mapScreenshotUrl`, `placeId`

**Notes:**
- `localTips` does NOT exist on ThingToDo
- `metadata` fields `address`, `phone`, `website`, `email` do NOT work — use UnlockedThingToDo fields instead
- `description` is ProseMirror JSON (`{"type":"doc","content":[...]}`) — parse by extracting text nodes

### Location
- `lat` (String!, non-null)
- `long` (String!, non-null) — alias as `lng` in queries: `location { lat lng: long }`

**Note:** NOT `latitude`/`longitude`/`name` — just `lat` and `long`.

### Media (Union: Image | Video)

**Image:**
- `id`, `url`, `source` (enum: RexbyImage, etc.), `order` (Int), `attributions`

**Video:**
- `id`, `order`, `mp4Url`, `webmUrl`, `muted`, `width`, `height`
- `thumbnail` → Image (has `url`)
- `poster` → Image (has `url`)
- `attributions`

**Note:** The app's original fragment uses `s3Origin` but `mp4Url`/`webmUrl` are the playable URLs.

### Guide
- `id` (UUID!), `title`, `slug`
- `locales` — array of locale codes (e.g. `["en"]`). Language is per-guide, no locale param on queries
- `thingsToDo` → list of ThingToDo
- `creator` → CreatorV2 object
- `destination` / `destinationV2` → Country (`id`, `name`, `countryCode`)
- `area`, `picture`
- `numberOfItineraryItems`, `numberOfItineraries`, `numberOfTravelTips`
- `isPublished`
- `boundingBox` → `xmin`/`xmax`/`ymin`/`ymax`
- `coverPhotoV2` → Image
- `mapScreenshotUrl(width, height, dpr)`
- `estimatedUserCount`, `hasBoughtMap`, `hasBoughtProfile`

### ThingToDoMetadata
- `id`, `activityLevel`, `ageRequirement`, `estimatedTime`, `priceIndicator`
- `restaurantType`, `seasonality`, `transportType`
- **Note:** `address`, `phone`, `website`, `email` are NOT valid fields here (use UnlockedThingToDo fields)

## Key Queries

### `thingToDo(thingToDoId: UUID!, itineraryId: UUID, tripId: UUID, bypassFreemium: Boolean)`
Fetch a single ThingToDo by ID. Use `bypassFreemium: true` to get full data.
No locale parameter — language depends on the guide's creator.

### `thingsToDo(guideId: UUID!)`
Fetch all ThingToDo items for a guide (returns basic fields only — id, title, slug, location).

### `thingsToDoByIds(ids: [UUID!]!)`
Batch fetch multiple ThingToDo items by IDs.

### `guide(id: UUID!)`
Fetch a guide with nested thingsToDo.

### `ttdUrls(pageNumber: Int, pageSize: Int)`
Paginated list of all ThingToDo across the platform (SEO endpoint). Returns `id`, `slug`.

## Known Guides

### "Hidden gems in Bulgaria" (English)
- **Guide ID:** `bxreB5ggTkKkuepGUTHvsA`
- **Locales:** `["en"]`
- Contains ~200 thingToDo items
- Data file: `data.json`

### "Непознатата България" (Bulgarian)
- **Guide ID:** `wGBX82ulTb-Al6ITXkWb7A`
- **Locales:** `["en"]` (but content is in Bulgarian — locales field doesn't reflect actual language)
- Creator: Ramblewitht (Maria Tarashmanova)
- Contains ~287 thingToDo items
- Data file: `data-bg.json`

## Gotchas
1. Location uses `lat`/`long` — alias as `lng` in queries
2. No `localTips` field
3. Metadata doesn't have address/phone/website/email — those are on UnlockedThingToDo
4. Description is ProseMirror JSON, not plain text
5. Duration is a string enum, not minutes
6. Language is baked into the guide content — no locale parameter
7. CORS blocks browser requests from `file://` — need a local server
8. CDN images can be resized with query params
