/* ---- Helpers ---- */
var CATEGORY_COLORS = {};
var COLOR_PALETTE = [
  '#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12',
  '#1abc9c','#e67e22','#34495e','#e91e63','#00bcd4',
  '#8bc34a','#ff5722','#607d8b','#795548','#673ab7',
  '#009688','#ff9800','#3f51b5','#cddc39','#f44336'
];
var colorIdx = 0;

function getCatColor(cat) {
  if (!cat) return '#999';
  var k = cat.toLowerCase();
  if (!CATEGORY_COLORS[k]) { CATEGORY_COLORS[k] = COLOR_PALETTE[colorIdx++ % COLOR_PALETTE.length]; }
  return CATEGORY_COLORS[k];
}

function parseDesc(desc) {
  if (!desc) return '';
  if (typeof desc === 'string') { try { desc = JSON.parse(desc); } catch(e) { return desc; } }
  return extractTxt(desc);
}
function extractTxt(n) {
  if (!n) return '';
  if (n.type === 'text') return n.text || '';
  if (!n.content) return '';
  return n.content.map(function(c) {
    var t = extractTxt(c);
    return (c.type === 'paragraph' || c.type === 'heading') ? t + '\n' : t;
  }).join('').trim();
}

var DUR_ORDER = { 'ExtremelyShort':1,'Short':2,'Medium':3,'Long':4,'ExtremelyLong':5,'AllDay':6 };

function fmtDur(d) {
  if (!d) return null;
  if (typeof d === 'number') { return d < 60 ? d+'m' : Math.floor(d/60)+'h'+(d%60 ? ' '+d%60+'m' : ''); }
  return t.dur[d] || d.replace(/([A-Z])/g,' $1').trim();
}
function fmtCat(c) {
  if (!c) return t.cat.unknown || 'Unknown';
  var key = c.toLowerCase().replace(/_/g,'');
  return t.cat[key] || c.replace(/_/g,' ').replace(/\b\w/g, function(x){return x.toUpperCase();});
}
function esc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
          Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180) *
          Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function cdnResize(url, w, h) {
  if (!url) return url;
  if (url.indexOf('cdn.prod.rexby.com/image/') === -1) return url;
  var sep = url.indexOf('?') === -1 ? '?' : '&';
  return url + sep + 'format=webp&width=' + w + '&height=' + h;
}

function getThumbUrl(item) {
  if (!item.media || !item.media.length) return null;
  var sorted = item.media.slice().sort(function(a,b){ return (a.order||0)-(b.order||0); });
  for (var i=0; i<sorted.length; i++) {
    var m = sorted[i];
    if (m.__typename==='Image' && m.url) return cdnResize(m.url, 384, 288);
    if (m.__typename==='Video') {
      if (m.thumbnail && m.thumbnail.url) return cdnResize(m.thumbnail.url, 384, 288);
      if (m.poster && m.poster.url) return cdnResize(m.poster.url, 384, 288);
    }
  }
  return null;
}

function getMediaUrls(item) {
  if (!item.media || !item.media.length) return [];
  return item.media.slice().sort(function(a,b){ return (a.order||0)-(b.order||0); }).map(function(m) {
    if (m.__typename==='Image') return { type:'image', url: cdnResize(m.url, 750, 560) };
    if (m.__typename==='Video') return { type:'video', url: m.mp4Url || '', poster: cdnResize((m.poster && m.poster.url) || (m.thumbnail && m.thumbnail.url) || '', 750, 560) };
    return null;
  }).filter(Boolean);
}

/* ---- State ---- */
var allGuides = [];       // from guides.json
var allDataByGuide = {};  // guideId -> [items]
var allItems = [];        // merged, filtered by active guide
var activeGuide = null;   // null = all guides
var activeCategory = null;
var currentSlide = 0;
var currentMedia = [];
var geoCenter = null;
var geoRadius = 100;
var t = L.en;

/* ---- Card rendering ---- */
function renderCard(item, idx) {
  var cat = item.primaryCategory || 'Unknown';
  var color = getCatColor(cat);
  var thumb = getThumbUrl(item);
  var mc = item.media ? item.media.length : 0;
  var dur = fmtDur(item.duration);

  var h = '<div class="card" onclick="openModal('+idx+')">';

  if (thumb) {
    h += '<div class="card-thumb" style="border-top:3px solid '+color+'">';
    h += '<img src="'+thumb+'" alt="" loading="lazy">';
    h += '<span class="badge" style="background:'+color+'">'+fmtCat(cat)+'</span>';
    h += '<div class="indicators">';
    if (item.isTopFavorited) h += '<span class="ind ind-fav">&#9829;</span>';
    if (item.isSecret) h += '<span class="ind ind-secret">&#9733;</span>';
    h += '</div>';
    if (mc > 1) h += '<span class="img-count">'+mc+' '+t.photos+'</span>';
    h += '</div>';
  } else {
    h += '<div class="card-no-thumb" style="background:'+color+'18;border-top:3px solid '+color+'">&#128247;</div>';
  }

  h += '<div class="card-info">';
  h += '<h3>'+esc(item.title || 'Untitled')+'</h3>';
  h += '<div class="card-meta">';
  if (geoCenter && item._dist !== undefined) h += '<span>'+item._dist+' km</span>';
  if (dur) h += '<span>'+dur+'</span>';
  if (item.estimatedPrice && item.estimatedPrice.amount) h += '<span>'+item.estimatedPrice.amount+' '+(item.estimatedPrice.currency||'')+'</span>';
  h += '</div>';
  if (!activeGuide && item._guideTitle) h += '<div class="guide-tag">'+esc(item._guideTitle)+'</div>';
  h += '</div></div>';
  return h;
}

/* ---- Modal ---- */
function openModal(idx) {
  var items = getFilteredItems();
  var item = items[idx];
  if (!item) return;

  var cat = item.primaryCategory || 'Unknown';
  var color = getCatColor(cat);
  var desc = item._plainDesc || '';
  var loc = item.location;
  var price = item.estimatedPrice;
  var dur = fmtDur(item.duration);
  currentMedia = getMediaUrls(item);
  currentSlide = 0;

  var h = '';

  // Slider
  if (currentMedia.length > 0) {
    h += '<div class="slider" id="slider">';
    currentMedia.forEach(function(m, i) {
      if (m.type === 'image') {
        h += '<img src="'+m.url+'" class="'+(i===0?'active':'')+'" data-idx="'+i+'">';
      } else {
        h += '<video src="'+m.url+'" poster="'+m.poster+'" class="'+(i===0?'active':'')+'" data-idx="'+i+'" controls playsinline preload="metadata"></video>';
      }
    });
    if (currentMedia.length > 1) {
      h += '<button class="slider-btn prev" onclick="slideNav(-1,event)">&#8249;</button>';
      h += '<button class="slider-btn next" onclick="slideNav(1,event)">&#8250;</button>';
      h += '<span class="slider-counter" id="slider-counter">1 / '+currentMedia.length+'</span>';
      h += '<div class="slider-dots" id="slider-dots">';
      currentMedia.forEach(function(m, i) {
        h += '<button class="slider-dot'+(i===0?' active':'')+'" onclick="slideTo('+i+',event)"></button>';
      });
      h += '</div>';
    }
    h += '</div>';
  }

  h += '<div class="modal-body">';
  h += '<h2>'+esc(item.title || 'Untitled')+'</h2>';

  // Badges
  h += '<div class="modal-badges">';
  h += '<span class="mbadge" style="background:'+color+'">'+fmtCat(cat)+'</span>';
  if (item.secondaryCategories && item.secondaryCategories.length) {
    item.secondaryCategories.forEach(function(c) {
      h += '<span class="mbadge-outline">'+esc(fmtCat(c))+'</span>';
    });
  }
  if (item._guideTitle) h += '<span class="mbadge-outline">'+esc(item._guideTitle)+'</span>';
  h += '</div>';

  // Indicators
  h += '<div class="modal-indicators" style="margin-bottom:1rem">';
  if (item.isOpen === true) h += '<span class="modal-ind mi-open">'+t.open+'</span>';
  if (item.isOpen === false) h += '<span class="modal-ind mi-closed">'+t.closed+'</span>';
  if (item.isSecret) h += '<span class="modal-ind mi-secret">&#9733; '+t.secretSpot+'</span>';
  if (item.isTopFavorited) h += '<span class="modal-ind mi-fav">&#9829; '+t.topFavorited+'</span>';
  h += '</div>';

  if (desc) h += '<div class="modal-description">'+esc(desc)+'</div>';

  // Detail chips
  h += '<div class="modal-details">';
  if (dur) h += '<span class="modal-chip">&#9202; '+dur+'</span>';
  if (price && price.amount) h += '<span class="modal-chip">&#128176; '+price.amount+' '+(price.currency||'')+'</span>';
  if (item.categoryClass && item.categoryClass.name) h += '<span class="modal-chip">'+esc(item.categoryClass.name)+'</span>';
  var det = item.detail || {};
  if (det.seasonality === 'AllSeasons') h += '<span class="modal-chip">'+t.allSeasons+'</span>';
  else if (det.seasonality) h += '<span class="modal-chip">'+esc(det.seasonality.replace(/([A-Z])/g,' $1').trim())+'</span>';
  if (det.ageRequirement === 'AllAges') h += '<span class="modal-chip">'+t.allAges+'</span>';
  else if (det.ageRequirement) h += '<span class="modal-chip">'+esc(det.ageRequirement.replace(/([A-Z])/g,' $1').trim())+'</span>';
  if (det.activityLevel) h += '<span class="modal-chip">'+t.effort+': '+det.activityLevel+'/5</span>';
  h += '</div>';

  // Location
  if (loc && loc.lat && loc.lng) {
    var url = 'https://www.google.com/maps?q='+loc.lat+','+loc.lng;
    h += '<div class="modal-location">';
    if (item.locationName) h += '<strong>'+esc(item.locationName)+'</strong><br>';
    h += '&#128205; <a href="'+url+'" target="_blank" rel="noopener">'+t.openMaps+'</a> <span style="color:#999;font-size:0.8rem">('+loc.lat+', '+loc.lng+')</span>';
    if (geoCenter && item._dist !== undefined) h += ' &mdash; <strong>'+item._dist+' km</strong> '+t.fromCity;
    h += '</div>';
  }

  var extras = [];
  if (item.address) extras.push('&#127968; ' + esc(item.address));
  if (item.website) extras.push('&#127760; <a href="'+item.website+'" target="_blank" rel="noopener">'+esc(item.website)+'</a>');
  if (item.regionNames && item.regionNames.length) extras.push('&#128204; ' + item.regionNames.map(esc).join(' > '));
  if (extras.length) {
    h += '<div style="font-size:0.82rem;color:#666;margin-top:0.75rem;display:flex;flex-direction:column;gap:0.3rem">';
    extras.forEach(function(e) { h += '<span>'+e+'</span>'; });
    h += '</div>';
  }

  h += '</div>';

  document.getElementById('modal-content').innerHTML = h;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  document.querySelectorAll('#slider video').forEach(function(v) { v.pause(); });
}

function slideTo(idx, e) {
  if (e) e.stopPropagation();
  currentSlide = idx;
  var items = document.querySelectorAll('#slider img, #slider video');
  items.forEach(function(el) {
    el.classList.toggle('active', parseInt(el.dataset.idx) === idx);
    if (el.tagName === 'VIDEO' && parseInt(el.dataset.idx) !== idx) el.pause();
  });
  var counter = document.getElementById('slider-counter');
  if (counter) counter.textContent = (idx+1)+' / '+currentMedia.length;
  var dots = document.querySelectorAll('#slider-dots .slider-dot');
  dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });
}

function slideNav(dir, e) {
  if (e) e.stopPropagation();
  var next = currentSlide + dir;
  if (next < 0) next = currentMedia.length - 1;
  if (next >= currentMedia.length) next = 0;
  slideTo(next);
}

/* ---- Grid / filters ---- */
function getFilteredItems() {
  var q = document.getElementById('search').value.toLowerCase().trim();
  var sortBy = document.getElementById('sort').value;
  var filtered = allItems.filter(function(item) {
    if (activeGuide && item._guideId !== activeGuide) return false;
    var cat = (item.primaryCategory || '').toLowerCase();
    if (activeCategory && cat !== activeCategory) return false;
    if (q) {
      var ti = (item.title || '').toLowerCase();
      var d = (item._plainDesc || '').toLowerCase();
      if (ti.indexOf(q)===-1 && d.indexOf(q)===-1) return false;
    }
    if (geoCenter && item.location && item.location.lat && item.location.lng) {
      var dist = haversine(geoCenter.lat, geoCenter.lon, parseFloat(item.location.lat), parseFloat(item.location.lng));
      item._dist = Math.round(dist);
      if (dist > geoRadius) return false;
    } else if (geoCenter) {
      return false;
    }
    return true;
  });
  filtered.sort(function(a,b) {
    if (geoCenter && sortBy !== 'title' && sortBy !== 'category') return (a._dist||0)-(b._dist||0);
    if (sortBy==='title') return (a.title||'').localeCompare(b.title||'');
    if (sortBy==='category') return (a.primaryCategory||'').localeCompare(b.primaryCategory||'');
    if (sortBy==='duration') return (a._durSort||0)-(b._durSort||0);
    if (sortBy==='distance') return (a._dist||0)-(b._dist||0);
    return 0;
  });
  return filtered;
}

function renderGrid() {
  var filtered = getFilteredItems();
  var grid = document.getElementById('grid');
  document.getElementById('item-count').textContent = filtered.length+' '+t.of+' '+allItems.length+' '+t.items;
  renderCatFilters();
  if (!filtered.length) { grid.innerHTML = '<div class="no-results">'+t.noResults+'</div>'; return; }
  grid.innerHTML = filtered.map(renderCard).join('');
}

function getBaseFiltered() {
  var q = document.getElementById('search').value.toLowerCase().trim();
  return allItems.filter(function(item) {
    if (activeGuide && item._guideId !== activeGuide) return false;
    if (q) {
      var ti = (item.title || '').toLowerCase();
      var d = (item._plainDesc || '').toLowerCase();
      if (ti.indexOf(q)===-1 && d.indexOf(q)===-1) return false;
    }
    if (geoCenter && item.location && item.location.lat && item.location.lng) {
      var dist = haversine(geoCenter.lat, geoCenter.lon, parseFloat(item.location.lat), parseFloat(item.location.lng));
      if (dist > geoRadius) return false;
    } else if (geoCenter) {
      return false;
    }
    return true;
  });
}

function renderCatFilters() {
  var base = getBaseFiltered();
  var cats = {};
  allItems.forEach(function(i) {
    if (activeGuide && i._guideId !== activeGuide) return;
    var c=(i.primaryCategory||'unknown').toLowerCase(); if (!(c in cats)) cats[c]=0;
  });
  base.forEach(function(i) { var c=(i.primaryCategory||'unknown').toLowerCase(); cats[c]=(cats[c]||0)+1; });
  var sorted = Object.entries(cats).sort(function(a,b){return b[1]-a[1];});
  var el = document.getElementById('category-filters');
  var h = '<button class="cat-btn all-btn" onclick="setCat(null)">'+t.all+' ('+base.length+')</button>';
  sorted.forEach(function(e) {
    var c=e[0], n=e[1], col=getCatColor(c);
    h += '<button class="cat-btn" data-cat="'+c+'" style="background:'+col+';color:white;opacity:'+(n>0?'0.7':'0.3')+'" onclick="setCat(\''+c+'\')">'+fmtCat(c)+' ('+n+')</button>';
  });
  el.innerHTML = h;
  updateCatBtns();
}

function setCat(c) { activeCategory=c; updateCatBtns(); updateCatLabel(); renderGrid(); }
function toggleCats() {
  var acc = document.getElementById('cat-accordion');
  var btn = document.getElementById('cat-toggle');
  acc.classList.toggle('open');
  btn.classList.toggle('open');
}

function updateCatLabel() {
  var label = document.getElementById('cat-active-label');
  if (activeCategory) {
    label.textContent = '— ' + fmtCat(activeCategory);
    label.style.fontWeight = '600';
    label.style.color = getCatColor(activeCategory);
  } else {
    label.textContent = '';
  }
}

function clearGeo() {
  geoCenter = null;
  document.getElementById('geo-city').value = '';
  document.getElementById('geo-clear').style.display = 'none';
  document.getElementById('geo-info').textContent = '';
  renderGrid();
}

function updateCatBtns() {
  document.querySelectorAll('.cat-btn').forEach(function(b) {
    if (b.classList.contains('all-btn')) { b.classList.toggle('inactive', activeCategory!==null); return; }
    b.style.opacity = (!activeCategory || b.dataset.cat===activeCategory) ? '1' : '0.4';
  });
}

/* ---- Translations ---- */
function applyTranslations() {
  document.querySelector('.subtitle').textContent = t.subtitle;
  document.getElementById('search').placeholder = t.searchPlaceholder;
  var sortEl = document.getElementById('sort');
  sortEl.options[0].text = t.sortTitle;
  sortEl.options[1].text = t.sortCategory;
  sortEl.options[2].text = t.sortDuration;
  sortEl.options[3].text = t.sortDistance;
  document.querySelector('.geo-row label:first-child').textContent = t.near;
  document.querySelectorAll('.geo-row label')[1].textContent = t.radius;
  document.querySelector('#cat-toggle span:first-child').textContent = t.categories;
}

/* ---- City dropdown ---- */
function buildCityDropdown() {
  var select = document.getElementById('geo-city');
  var lang = 'en';
  var countries = [];

  if (activeGuide) {
    var guide = allGuides.find(function(g) { return g.id === activeGuide; });
    if (guide) {
      lang = guide.lang || 'en';
      if (guide.country && CITIES[guide.country]) countries.push(guide.country);
    }
  } else {
    // All guides — collect all unique countries
    var seen = {};
    allGuides.forEach(function(g) {
      if (g.country && CITIES[g.country] && !seen[g.country]) {
        countries.push(g.country);
        seen[g.country] = true;
      }
    });
  }

  var h = '<option value="">' + t.anywhere + '</option>';
  countries.forEach(function(cc, ci) {
    var cities = CITIES[cc];
    if (ci > 0) h += '<option disabled>---</option>';
    cities.forEach(function(city) {
      var label = (lang === 'bg' && city.bg) ? city.bg : city.name;
      h += '<option value="' + city.lat + ',' + city.lon + '">' + label + '</option>';
    });
  });

  select.innerHTML = h;
}

/* ---- Guide switching ---- */
function buildMergedItems() {
  allItems = [];
  Object.keys(allDataByGuide).forEach(function(guideId) {
    var guide = allGuides.find(function(g){return g.id===guideId;}) || {};
    allDataByGuide[guideId].forEach(function(item) {
      item._guideId = guideId;
      item._guideTitle = guide.title || guideId;
      item._guideLang = guide.lang || 'en';
      item._plainDesc = parseDesc(item.description);
      item._durSort = typeof item.duration === 'number' ? item.duration : (DUR_ORDER[item.duration] || 99);
      allItems.push(item);
    });
  });
}

function setGuide(guideId) {
  activeGuide = guideId;
  activeCategory = null;
  updateCatLabel();
  document.getElementById('search').value = '';

  // Determine language
  if (guideId) {
    var guide = allGuides.find(function(g){return g.id===guideId;});
    t = L[(guide && guide.lang) || 'en'] || L.en;
    document.getElementById('guide-title').textContent = guide ? guide.title : 'Rexby Explorer';
  } else {
    t = L.en;
    document.getElementById('guide-title').textContent = 'Rexby Explorer';
  }

  // Reset colors
  CATEGORY_COLORS = {};
  colorIdx = 0;

  // Pre-assign colors
  var cc = {};
  allItems.forEach(function(i) {
    if (guideId && i._guideId !== guideId) return;
    var c = (i.primaryCategory || 'unknown').toLowerCase();
    cc[c] = (cc[c] || 0) + 1;
  });
  Object.entries(cc).sort(function(a,b){return b[1]-a[1];}).forEach(function(e){getCatColor(e[0]);});

  // Clear geo filter and rebuild city dropdown for this guide's country
  clearGeo();
  buildCityDropdown();

  // Update guide buttons
  document.querySelectorAll('.guide-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.guide === (guideId || '__all'));
  });

  applyTranslations();
  renderCatFilters();
  renderGrid();
}
window.setGuide = setGuide;

/* ---- Expose to HTML ---- */
window.toggleCats = toggleCats;
window.clearGeo = clearGeo;
window.setCat = setCat;
window.openModal = openModal;
window.closeModal = closeModal;
window.slideTo = slideTo;
window.slideNav = slideNav;

/* ---- Init ---- */
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
  if (document.getElementById('modal-overlay').classList.contains('open')) {
    if (e.key === 'ArrowLeft') slideNav(-1);
    if (e.key === 'ArrowRight') slideNav(1);
  }
});
document.getElementById('search').addEventListener('input', renderGrid);
document.getElementById('sort').addEventListener('change', renderGrid);
document.getElementById('geo-city').addEventListener('change', function() {
  var v = this.value;
  if (v) {
    var parts = v.split(',');
    geoCenter = { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
    document.getElementById('geo-clear').style.display = '';
    document.getElementById('sort').value = 'distance';
  } else {
    geoCenter = null;
    document.getElementById('geo-clear').style.display = 'none';
    document.getElementById('geo-info').textContent = '';
  }
  geoRadius = parseInt(document.getElementById('geo-radius').value);
  renderGrid();
  if (geoCenter) {
    var n = getFilteredItems().length;
    document.getElementById('geo-info').textContent = n + ' ' + t.placesWithin + ' ' + geoRadius + ' km';
  }
});
document.getElementById('geo-radius').addEventListener('change', function() {
  geoRadius = parseInt(this.value);
  if (geoCenter) {
    renderGrid();
    var n = getFilteredItems().length;
    document.getElementById('geo-info').textContent = n + ' ' + t.placesWithin + ' ' + geoRadius + ' km';
  }
});

// Load guides.json, then all data files, then render
fetch('data/guides.json')
  .then(function(r) { return r.json(); })
  .then(function(guides) {
    allGuides = guides;

    // Build guide switcher buttons
    var switcher = document.getElementById('guide-switcher');
    var bh = '<button class="guide-btn active" data-guide="__all" onclick="setGuide(null)">All Guides</button>';
    guides.forEach(function(g) {
      bh += '<button class="guide-btn" data-guide="'+g.id+'" onclick="setGuide(\''+g.id+'\')">'+esc(g.title)+'</button>';
    });
    switcher.innerHTML = bh;

    // Fetch all data files in parallel
    return Promise.all(guides.map(function(g) {
      return fetch('data/' + g.id + '.json')
        .then(function(r) { return r.json(); })
        .then(function(data) { allDataByGuide[g.id] = data; })
        .catch(function(err) { console.warn('Failed to load ' + g.id, err); });
    }));
  })
  .then(function() {
    buildMergedItems();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('controls').style.display = '';

    // Pre-assign colors
    var cc = {};
    allItems.forEach(function(i) { var c = (i.primaryCategory || 'unknown').toLowerCase(); cc[c] = (cc[c] || 0) + 1; });
    Object.entries(cc).sort(function(a,b){return b[1]-a[1];}).forEach(function(e){getCatColor(e[0]);});

    buildCityDropdown();
    renderCatFilters();
    renderGrid();
  })
  .catch(function(err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = '';
    document.getElementById('error').textContent = 'Failed to load: ' + err.message;
  });
