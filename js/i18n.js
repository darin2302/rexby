var L = {
  en: {
    subtitle: 'Explore unique things to do across Bulgaria',
    searchPlaceholder: 'Search by title or description...',
    sortTitle: 'Sort by Title', sortCategory: 'Sort by Category', sortDuration: 'Sort by Duration', sortDistance: 'Sort by Distance',
    near: 'Near:', radius: 'Radius:', anywhere: 'Anywhere',
    categories: 'Categories', all: 'All', allGuides: 'All Guides',
    open: 'Open', closed: 'Closed', secretSpot: 'Secret Spot', topFavorited: 'Top Favorited',
    openMaps: 'Open in Google Maps', fromCity: 'from selected city',
    photos: 'photos', noResults: 'No matching items found.',
    items: 'items', of: 'of', placesWithin: 'places within',
    allSeasons: 'All Seasons', allAges: 'All Ages', effort: 'Effort',
    loading: 'Loading things to do...',
    dur: { 'ExtremelyShort':'< 30m','Short':'30m-1h','Medium':'1-2h','Long':'2-4h','ExtremelyLong':'4h+','AllDay':'All day' },
    cat: {
      sightseeing:'Sightseeing', tours:'Tours', hike:'Hike', activity:'Activity',
      waterfall:'Waterfall', restaurant:'Restaurant', beach:'Beach', bar:'Bar',
      hotel:'Hotel', villa:'Villa', camping:'Camping', cave:'Cave',
      viewpoint:'Viewpoint', lake:'Lake', spring:'Spring', unknown:'Unknown',
      ski:'Ski', spa:'Spa', canyon:'Canyon', monastery:'Monastery',
      museum:'Museum', market:'Market', park:'Park', bridge:'Bridge',
      fortress:'Fortress', landmark:'Landmark', nightlife:'Nightlife',
      shopping:'Shopping', cafe:'Cafe', winery:'Winery', garden:'Garden'
    }
  },
  bg: {
    subtitle: 'Открий уникални места из България',
    searchPlaceholder: 'Търси по заглавие или описание...',
    sortTitle: 'По заглавие', sortCategory: 'По категория', sortDuration: 'По продължителност', sortDistance: 'По разстояние',
    near: 'Близо до:', radius: 'Радиус:', anywhere: 'Навсякъде',
    categories: 'Категории', all: 'Всички', allGuides: 'Всички гидове',
    open: 'Отворено', closed: 'Затворено', secretSpot: 'Тайно място', topFavorited: 'Топ любимо',
    openMaps: 'Отвори в Google Maps', fromCity: 'от избрания град',
    photos: 'снимки', noResults: 'Няма намерени резултати.',
    items: 'места', of: 'от', placesWithin: 'места в радиус',
    allSeasons: 'Целогодишно', allAges: 'За всички възрасти', effort: 'Усилие',
    loading: 'Зареждане...',
    dur: { 'ExtremelyShort':'< 30м','Short':'30м-1ч','Medium':'1-2ч','Long':'2-4ч','ExtremelyLong':'4ч+','AllDay':'Цял ден' },
    cat: {
      sightseeing:'Забележителност', tours:'Турове', hike:'Поход', activity:'Активност',
      waterfall:'Водопад', restaurant:'Ресторант', beach:'Плаж', bar:'Бар',
      hotel:'Хотел', villa:'Вила', camping:'Къмпинг', cave:'Пещера',
      viewpoint:'Гледка', lake:'Езеро', spring:'Извор', unknown:'Неизвестно',
      ski:'Ски', spa:'Спа', canyon:'Каньон', monastery:'Манастир',
      museum:'Музей', market:'Пазар', park:'Парк', bridge:'Мост',
      fortress:'Крепост', landmark:'Забележителност', nightlife:'Нощен живот',
      shopping:'Пазаруване', cafe:'Кафене', winery:'Винарна', garden:'Градина'
    }
  }
};

// City lists per country: { lat, lon, name, nameBg (optional) }
var CITIES = {
  BG: [
    { lat: 42.6977, lon: 23.3219, name: 'Sofia', bg: 'София' },
    { lat: 43.2141, lon: 27.9147, name: 'Varna', bg: 'Варна' },
    { lat: 42.1354, lon: 24.7453, name: 'Plovdiv', bg: 'Пловдив' },
    { lat: 42.4230, lon: 27.6928, name: 'Burgas', bg: 'Бургас' },
    { lat: 43.8486, lon: 25.9549, name: 'Ruse', bg: 'Русе' },
    { lat: 43.4085, lon: 24.6180, name: 'Pleven', bg: 'Плевен' },
    { lat: 42.4258, lon: 25.6257, name: 'Kazanlak', bg: 'Казанлък' },
    { lat: 43.0757, lon: 25.6172, name: 'Gabrovo', bg: 'Габрово' },
    { lat: 43.0848, lon: 25.9528, name: 'Tryavna', bg: 'Трявна' },
    { lat: 42.6842, lon: 26.3296, name: 'Sliven', bg: 'Сливен' },
    { lat: 42.0209, lon: 24.3119, name: 'Bansko', bg: 'Банско' },
    { lat: 42.6013, lon: 25.4148, name: 'Sopot', bg: 'Сопот' },
    { lat: 43.2778, lon: 28.5722, name: 'Balchik', bg: 'Балчик' },
    { lat: 42.6498, lon: 27.7365, name: 'Nesebar', bg: 'Несебър' },
    { lat: 42.0560, lon: 24.7994, name: 'Smolyan', bg: 'Смолян' },
    { lat: 43.2727, lon: 27.1920, name: 'Shumen', bg: 'Шумен' },
    { lat: 43.5612, lon: 27.8278, name: 'Dobrich', bg: 'Добрич' },
    { lat: 42.8742, lon: 25.3187, name: 'Karlovo', bg: 'Карлово' },
    { lat: 41.9434, lon: 23.4878, name: 'Blagoevgrad', bg: 'Благоевград' },
    { lat: 43.8564, lon: 25.3145, name: 'Nikopol', bg: 'Никопол' },
    { lat: 41.5988, lon: 24.7177, name: 'Shiroka Laka', bg: 'Широка лъка' },
    { lat: 42.5983, lon: 27.4470, name: 'Sozopol', bg: 'Созопол' },
    { lat: 43.4148, lon: 24.3102, name: 'Lovech', bg: 'Ловеч' },
    { lat: 43.2512, lon: 28.0128, name: 'Kavarna', bg: 'Каварна' }
  ],
  IE: [
    { lat: 53.3498, lon: -6.2603, name: 'Dublin' },
    { lat: 51.8985, lon: -8.4756, name: 'Cork' },
    { lat: 53.2707, lon: -9.0568, name: 'Galway' },
    { lat: 52.6638, lon: -8.6267, name: 'Limerick' },
    { lat: 54.5973, lon: -5.9301, name: 'Belfast' },
    { lat: 52.2593, lon: -7.1101, name: 'Waterford' },
    { lat: 52.0593, lon: -9.5072, name: 'Killarney' },
    { lat: 54.2766, lon: -8.4761, name: 'Sligo' },
    { lat: 52.8409, lon: -6.9326, name: 'Kilkenny' },
    { lat: 53.7179, lon: -6.3561, name: 'Drogheda' },
    { lat: 53.5215, lon: -7.3378, name: 'Athlone' },
    { lat: 54.6538, lon: -8.1096, name: 'Donegal' },
    { lat: 51.9479, lon: -10.0327, name: 'Kenmare' },
    { lat: 52.9714, lon: -9.4309, name: 'Doolin' },
    { lat: 51.7520, lon: -9.8602, name: 'Bantry' },
    { lat: 53.1424, lon: -7.6921, name: 'Tullamore' },
    { lat: 52.3369, lon: -6.4633, name: 'Wexford' },
    { lat: 53.0151, lon: -6.0116, name: 'Wicklow' },
    { lat: 51.8986, lon: -8.0956, name: 'Cobh' },
    { lat: 52.0616, lon: -10.2727, name: 'Dingle' }
  ]
};
