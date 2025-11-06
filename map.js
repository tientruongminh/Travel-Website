// map.js - Youth & Dynamic Theme for Đoàn Thanh Niên
// Modern colors: Blue + Teal + Vibrant gradients

// Load Turf.js
const turfScript = document.createElement('script');
turfScript.src = "https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js";
turfScript.onload = () => console.log("✅ Turf loaded");
document.head.appendChild(turfScript);

// ====== COLOR PALETTE - YOUTH & DYNAMIC ======
const COLORS = {
  primary: "#0077C8",   // Đoàn blue
  secondary: "#00BFA6", // Mint teal
  sky: "#64B5F6",       // Sky blue
  ocean: "#0288D1",     // Ocean
  teal: "#00ACC1",      // Teal
  leaf: "#81C784",      // Leaf green
  lime: "#AED581",      // Lime
  aqua: "#4DD0E1",      // Aqua
  violet: "#9575CD",    // Soft violet
  coral: "#FF8A65",     // Coral
  yellow: "#FFD54F",    // Sunny yellow
  pink: "#F06292",      // Pink
  border: "#0f4a43"     // Dark teal border
};

// Unit palette - vibrant & youthful
const UNIT_PALETTE = [
  COLORS.secondary, COLORS.sky, COLORS.teal, COLORS.aqua,
  COLORS.leaf, COLORS.lime, COLORS.ocean, COLORS.violet,
  "#80DEEA", "#A5D6A7", "#90CAF9", "#CE93D8",
  COLORS.yellow, COLORS.coral, COLORS.pink
];

// Map tiles - clean & bright
const CARTO_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR = "&copy; OpenStreetMap &copy; CARTO";

console.log("🟢 Initializing Youth Dynamic Map...");
const map = L.map("mapid", { zoomControl: true });
L.tileLayer(CARTO_TILES, { maxZoom: 22, attribution: CARTO_ATTR }).addTo(map);

// ====== CUSTOM CIRCLE ICONS ======
function makeCircleIcon(imageUrl, size = 44) {
  return L.divIcon({
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        overflow:hidden;
        background:linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
        box-shadow: 0 0 0 3px #fff, 0 4px 12px rgba(0,119,200,.3);
        transition: transform .2s;
      ">
        <img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;display:block"/>
      </div>
    `,
    className: "icon-circle",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -Math.round(size * 0.55)]
  });
}

const customIcons = {
  tour: makeCircleIcon("./images/icons/tour.png", 44),
  service: makeCircleIcon("./images/icons/service.png", 44),
  event: makeCircleIcon("./images/icons/event.png", 44),
  eat: makeCircleIcon("./images/icons/eat.png", 44),
  stay: makeCircleIcon("./images/icons/stay.png", 44),
  play: makeCircleIcon("./images/icons/play.png", 44)
};

// ====== STATE ======
let qnBounds = null;
let allPoints = [];
let current = [];
let markers = [];

const markersLayer = L.layerGroup();
map.addLayer(markersLayer);

// ====== UI REFS ======
const els = {
  cards: document.getElementById("cards"),
  spotList: document.getElementById("spot-list"),
  statAll: document.getElementById("stat-all"),
  statTour: document.getElementById("stat-tour"),
  statSvc: document.getElementById("stat-svc"),
  statEvt: document.getElementById("stat-evt"),
  keyword: document.getElementById("keyword"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebar: document.getElementById("sidebar")
};

let autoScrollInterval = null;

init();

// ====== INIT ======
async function init() {
  try {
    const boundaryP = fetch("data/quangninh.geojson?v=3").then(r => r.json());
    const spotsP = fetch("data/spots.json?v=3").then(r => r.json());
    const unitsP = fetch("data/quang_ninh_54units.geojson?v=1").then(r => r.json()).catch(() => null);

    let geo, spots, units;
    
    try {
      geo = await boundaryP;
      console.log("✅ Boundary loaded");
    } catch {
      console.warn("⚠️ Boundary fetch failed → demo polygon");
      geo = demoBoundaryGeoJSON();
    }

    try {
      spots = await spotsP;
      console.log("✅ Spots loaded:", spots?.length ?? 0);
    } catch {
      console.warn("⚠️ Spots fetch failed → demo spots");
      spots = demoSpots();
    }

    try {
      units = await unitsP;
      console.log("✅ Units loaded:", units?.features?.length ?? 0);
    } catch {
      units = null;
    }

    // ====== BOUNDARY LAYER - Youth Style ======
    const boundaryStyle = {
      color: COLORS.primary,
      weight: 3,
      fillColor: "#E3F2FD",
      fillOpacity: 0.15,
      dashArray: "5, 5"
    };

    const boundaryLayer = L.geoJSON(geo, {
      filter: f => ["Polygon", "MultiPolygon"].includes(f.geometry?.type),
      style: boundaryStyle
    }).addTo(map);

    // Fit bounds
    qnBounds = boundaryLayer.getBounds();
    map.fitBounds(qnBounds);

    const fitZoom = map.getBoundsZoom(qnBounds);
    map.setMinZoom(fitZoom + 0.75);
    map.setMaxZoom(fitZoom + 10);
    map.setMaxBounds(qnBounds.pad(0.02));
    map.options.maxBoundsViscosity = 1.0;
    
    map.on("drag", () => map.panInsideBounds(qnBounds, { animate: true }));
    map.on("zoomend", () => {
      const z = map.getZoom();
      if (z < map.getMinZoom()) map.setZoom(map.getMinZoom());
      if (z > map.getMaxZoom()) map.setZoom(map.getMaxZoom());
    });

    // ====== 54 UNITS LAYER - Vibrant Colors ======
    function unitFillByName(name = "unit") {
      let h = 0;
      for (let i = 0; i < name.length; i++) {
        h = (h * 31 + name.charCodeAt(i)) >>> 0;
      }
      return UNIT_PALETTE[h % UNIT_PALETTE.length];
    }

    let unitsLayer = null;
    if (units && units.type === "FeatureCollection") {
      unitsLayer = L.geoJSON(units, {
        filter: f => ["Polygon", "MultiPolygon"].includes(f.geometry?.type),
        style: f => {
          const name = f.properties?.unit_54_name || "unit";
          return {
            color: COLORS.border,
            weight: 1.5,
            fillColor: unitFillByName(name),
            fillOpacity: 0.5,
            className: 'unit-polygon'
          };
        },
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.unit_54_name || "Chưa rõ";
          const type = feature.properties?.unit_54_type || "";
          
          layer.bindTooltip(`
            <div class="unit-tooltip">
              <div class="unit-name">${name}</div>
              ${type ? `<div class="unit-type">${type}</div>` : ''}
            </div>
          `, {
            direction: "center",
            permanent: false,
            sticky: true,
            className: "unit-label"
          });
          
          layer.on("mouseover", () => {
            layer.setStyle({ 
              weight: 3, 
              fillOpacity: 0.7,
              color: COLORS.primary
            });
          });
          
          layer.on("mouseout", () => {
            layer.setStyle({ 
              weight: 1.5, 
              fillOpacity: 0.5,
              color: COLORS.border
            });
          });
          
          layer.on("click", () => {
            map.fitBounds(layer.getBounds().pad(0.05), { 
              animate: true,
              duration: 0.8
            });
          });
        }
      }).addTo(map);
      
      unitsLayer.bringToFront();
    }

    // Normalize and render
    const userPoints = JSON.parse(localStorage.getItem("qn_user_points") || "[]");
    allPoints = normalizeSpots(spots).concat(normalizeSpots(userPoints));
    current = allPoints.slice();

    console.log("✅ Map ready. Points:", current.length);
    render(current);
    wireUI();
    startAutoScroll();
    
  } catch (err) {
    console.error("❌ Init failed:", err);
  }
}

// ====== RENDER ======
function render(points) {
  markersLayer.clearLayers();
  markers = [];

  points.forEach(p => {
    const iconKey = p.category || p.type || 'tour';
    const icon = customIcons[iconKey] || customIcons.tour;

    const m = L.marker([p.lat, p.lng], { icon });
    const html = buildPopupHTML(p);

    m.bindPopup(html, { maxWidth: 320, minWidth: 280 });
    m.on('popupopen', () => attachPopupEvents(p));
    m._meta = { id: p.id, category: p.category };

    markersLayer.addLayer(m);
    markers.push(m);
  });

  // Sidebar list
  if (els.spotList) {
    els.spotList.innerHTML = points.map(p => `
      <div class="spot-card" data-id="${esc(p.id)}">
        <img src="${esc(p.thumb || 'images/placeholder.jpg')}" alt="${esc(p.name)}">
        <div class="spot-info">
          <h4>${esc(p.name)}</h4>
          <div class="spot-meta" data-cat="${esc(p.category)}">
            ${catLabel(p.category)}
          </div>
          <p>${esc((p.desc || '').slice(0, 60))}${(p.desc || '').length > 60 ? '...' : ''}</p>
        </div>
      </div>
    `).join('');

    els.spotList.querySelectorAll('.spot-card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        const spot = points.find(p => p.id === id);
        if (spot) {
          map.flyTo([spot.lat, spot.lng], Math.max(map.getZoom(), map.getMinZoom() + 2), { duration: 0.8 });
          const mk = markers.find(m => m._meta?.id === id);
          if (mk) mk.openPopup();
        }
      };
    });
  }

  // Bottom cards
  if (els.cards) {
    const handleHTML = `<button class="sheet-handle" aria-label="Thu gọn/mở rộng"><div class="grabber"></div></button>`;
    
    els.cards.innerHTML = handleHTML + points.map(p => `
      <div class="card-mini" data-id="${esc(p.id)}">
        <div class="card">
          <img class="thumb" src="${esc(p.thumb || 'images/placeholder.jpg')}" alt="">
          <div>
            <h4>${esc(p.name)}</h4>
            <div class="meta">
              <span class="material-icons">${getCategoryIcon(p.category)}</span> 
              ${catLabel(p.category)}
            </div>
            <div class="line">${esc((p.desc || '').slice(0, 72))}</div>
          </div>
        </div>
      </div>
    `).join('');

    els.cards.querySelectorAll('.card-mini').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        const spot = points.find(p => p.id === id);
        if (spot) {
          stopAutoScroll();
          map.flyTo([spot.lat, spot.lng], Math.max(map.getZoom(), map.getMinZoom() + 2), { duration: 0.8 });
          const mk = markers.find(m => m._meta?.id === id);
          if (mk) mk.openPopup();
        }
      };
    });
  }

  updateStats(points);
}

function updateStats(points) {
  const total = points.length;
  const tour = points.filter(p => catIs(p, "tour")).length;
  const svc = points.filter(p => catIs(p, "service")).length;
  const evt = points.filter(p => catIs(p, "event")).length;

  setText(els.statAll, total);
  setText(els.statTour, tour);
  setText(els.statSvc, svc);
  setText(els.statEvt, evt);
}

// ====== AUTO SCROLL ======
function startAutoScroll() {
  if (autoScrollInterval) return;

  autoScrollInterval = setInterval(() => {
    if (els.cards && !els.cards.classList.contains('collapsed')) {
      const scrollAmount = els.cards.scrollLeft + 1;
      els.cards.scrollLeft = scrollAmount;
      if (els.cards.scrollLeft >= els.cards.scrollWidth - els.cards.clientWidth) {
        els.cards.scrollLeft = 0;
      }
    }
  }, 30);
}

function stopAutoScroll() {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
}

if (els.cards) {
  els.cards.addEventListener('mouseenter', stopAutoScroll);
  els.cards.addEventListener('touchstart', stopAutoScroll);
  els.cards.addEventListener('mouseleave', startAutoScroll);
}

// ====== UI WIRING ======
function wireUI() {
  // Stats collapsible toggle
  const statsEl = document.querySelector('.stats');
  const statsHeader = document.querySelector('.stats-header');
  
  if (statsHeader) {
    statsHeader.addEventListener('click', () => {
      statsEl?.classList.toggle('expanded');
    });
    // Auto expand on first load
    setTimeout(() => statsEl?.classList.add('expanded'), 300);
  }

  // Search
  els.keyword?.addEventListener("input", () => {
    const kw = els.keyword.value.trim().toLowerCase();
    const activeBtn = document.querySelector('.pill.active');
    const mode = activeBtn?.dataset.cat || "all";

    current = filterByMode(allPoints, mode).filter(p =>
      !kw ||
      p.name.toLowerCase().includes(kw) ||
      (p.desc || "").toLowerCase().includes(kw) ||
      (p.address || "").toLowerCase().includes(kw)
    );
    render(current);
  });

  // Sidebar toggle
  els.sidebarToggle?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    els.sidebar?.classList.toggle("collapsed");
  });

  // Bottom nav
  document.getElementById("open-explore")?.addEventListener("click", () => {
    location.href = "explore.html";
  });
  
  document.getElementById("open-profile")?.addEventListener("click", () => {
    location.href = "profile.html";
  });

  // Filter pills
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const mode = pill.dataset.cat || 'all';
      const kw = els.keyword?.value?.trim().toLowerCase() || "";
      current = filterByMode(allPoints, mode).filter(p =>
        !kw ||
        p.name.toLowerCase().includes(kw) ||
        (p.desc || "").toLowerCase().includes(kw)
      );
      render(current);
    });
  });

  // Escape key
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && els.sidebar && !els.sidebar.classList.contains('collapsed')) {
      els.sidebar.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
    }
  });
}

// ====== POPUP BUILDER ======
function buildPopupHTML(p) {
  const hasCarousel = (p.media?.length || 0) > 1;
  const first = p.media?.[0];

  const mediaHTML = hasCarousel
    ? `<div class="popup-carousel" data-id="${esc(p.id)}" data-idx="0">
        ${renderMedia(first)}
        <div class="carousel-nav">
          <button class="carousel-btn" data-act="prev" disabled>&lsaquo;</button>
          <button class="carousel-btn" data-act="next">&rsaquo;</button>
        </div>
      </div>`
    : (first ? renderMedia(first)
      : `<img src="${esc(p.thumb || 'images/placeholder.jpg')}" class="popup-media" alt="${esc(p.name)}">`);

  const badgeClass = typeBadgeClass(p.type);
  const gmaps = googleMapsLink(p.lat, p.lng);
  const detailLink = `detail.html?id=${esc(p.id)}`;

  return `
  <div class="popup-card" data-id="${esc(p.id)}">
    ${mediaHTML}
    <div class="popup-body">
      <div class="popup-title">
        ${typeIconHTML(p.type)} <span>${esc(p.name)}</span>
      </div>
      <span class="${badgeClass}">${catLabel(p.category)}</span>
      <p class="popup-desc">${esc(p.desc || '')}</p>
      ${p.address ? `<div style="font-size:12px;color:#475569;display:flex;gap:6px;align-items:center;margin:6px 0 10px">
        <span class="material-icons" style="font-size:16px;color:${COLORS.primary}">place</span>
        <span>${esc(p.address)}</span>
      </div>` : ''}
      ${p.hours ? `<div style="font-size:12px;color:#64748b;margin:-6px 0 10px">${esc(p.hours)}</div>` : ''}
      <div class="popup-actions">
        <a href="${detailLink}" class="btn-cta">Xem chi tiết</a>
        <a href="${gmaps}" class="btn-cta btn-ghost" target="_blank" rel="noopener">Chỉ đường</a>
        <button class="btn-cta btn-ghost" data-bookmark="${esc(p.id)}">Lưu</button>
      </div>
    </div>
  </div>`;
}

function renderMedia(m) {
  if (!m) return '';
  const t = (m.type || '').toLowerCase();

  if (t === 'video') {
    return `<div style="height:140px"><video controls class="popup-media"><source src="${esc(m.url)}"></video></div>`;
  }
  if (t === 'youtube') {
    const src = m.url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/");
    return `<div class="popup-media" style="height:140px;padding:0">
      <iframe width="100%" height="140" src="${esc(src)}" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>`;
  }
  return `<img src="${esc(m.url)}" class="popup-media" alt="">`;
}

function attachPopupEvents(p) {
  // Carousel
  const wrap = document.querySelector(`.popup-carousel[data-id="${CSS.escape(p.id)}"]`);
  if (wrap && Array.isArray(p.media) && p.media.length > 1) {
    let idx = parseInt(wrap.dataset.idx || '0', 10);

    function sync() {
      wrap.innerHTML = `
        ${renderMedia(p.media[idx])}
        <div class="carousel-nav">
          <button class="carousel-btn" data-act="prev"${idx <= 0 ? ' disabled' : ''}>&lsaquo;</button>
          <button class="carousel-btn" data-act="next"${idx >= p.media.length - 1 ? ' disabled' : ''}>&rsaquo;</button>
        </div>`;
      attach();
    }

    function attach() {
      const pb = wrap.querySelector('[data-act="prev"]');
      const nb = wrap.querySelector('[data-act="next"]');
      pb && (pb.onclick = () => { if (idx > 0) { idx--; sync(); } });
      nb && (nb.onclick = () => { if (idx < p.media.length - 1) { idx++; sync(); } });
    }
    attach();
  }

  // Bookmark
  const btn = document.querySelector(`button[data-bookmark="${CSS.escape(p.id)}"]`);
  if (btn) {
    btn.onclick = () => {
      const key = 'qn_bookmarks';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      if (!list.includes(p.id)) {
        list.push(p.id);
        localStorage.setItem(key, JSON.stringify(list));
        btn.textContent = 'Đã lưu ✓';
        btn.disabled = true;
      }
    };
  }
}

// ====== HELPERS ======
function getCategoryIcon(cat) {
  const icons = { 
    tour: 'landscape', 
    service: 'shopping_bag', 
    event: 'event',
    svc: 'shopping_bag',
    evt: 'event' 
  };
  return icons[cat] || 'place';
}

function getTypeIcon(type) {
  const icons = { eat: '🍽️', play: '🎡', stay: '🏨' };
  return icons[type] || '📍';
}

const ICON_SVG = {
  eat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2h2v20h-2V2zm7.5 7c1.93 0 3.5 1.57 3.5 3.5S20.43 16 18.5 16H17v6h-2V9h3.5zM9 7v6c0 2.21-1.79 4-4 4H4v5H2V3h2v6h1c1.66 0 3-1.34 3-3V3h2v4z"/></svg>',
  play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>',
  stay: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7V4H5v3H2v13h2v-2h16v2h2V7h-3zM5 18v-5h14v5H5zm0-7V6h14v5H5z"/></svg>'
};

function typeIconHTML(type) {
  const t = (type || '').toLowerCase();
  const svg = ICON_SVG[t] || ICON_SVG.play;
  return `<span style="display:inline-flex;align-items:center;gap:6px;color:${COLORS.primary}">${svg}</span>`;
}

function typeBadgeClass(type) {
  const t = (type || '').toLowerCase();
  if (t === 'eat') return 'popup-badge badge-eat';
  if (t === 'stay') return 'popup-badge badge-stay';
  return 'popup-badge badge-play';
}

function googleMapsLink(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function normalizeSpots(arr = []) {
  return arr.map(s => ({
    id: s.id || rid(),
    name: s.name || "Điểm",
    category: (s.category || s.typeCategory || s.typeCat || "tour").toLowerCase(),
    type: (s.type || "play").toLowerCase(),
    lat: s.lat ?? (Array.isArray(s.coords) ? s.coords[0] : 0),
    lng: s.lng ?? (Array.isArray(s.coords) ? s.coords[1] : 0),
    desc: s.desc || s.description || "",
    thumb: s.thumb || "",
    address: s.address || "",
    hours: s.hours || "",
    media: Array.isArray(s.media) ? s.media : (
      s.mediaUrl ? [{ type: (s.mediaType?.startsWith('video') ? 'video' : 'image'), url: s.mediaUrl }] : []
    ),
    detailUrl: s.detailUrl || ""
  }));
}

function filterByMode(list, mode) {
  if (mode === "all") return list;
  return list.filter(p => catIs(p, mode));
}

function catIs(p, m) {
  const c = (p.category || "").toLowerCase();
  if (m === "service" || m === "svc") return c === "service" || c === "svc";
  if (m === "event" || m === "evt") return c === "event" || c === "evt";
  if (m === "tour") return c === "tour";
  return false;
}

function catLabel(t) {
  const m = {
    tour: "Du lịch",
    service: "Sản phẩm",
    event: "Sự kiện",
    evt: "Sự kiện",
    svc: "Sản phẩm"
  };
  return m[t] || "Khác";
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function esc(s) {
  return (s || "").toString().replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function setText(el, v) {
  if (el) el.textContent = v;
}

// ====== DEMO FALLBACKS ======
function demoBoundaryGeoJSON() {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[107.0, 20.8], [107.5, 20.8], [107.5, 21.3], [107.0, 21.3], [107.0, 20.8]]]
      }
    }]
  };
}

function demoSpots() {
  return [
    {
      id: 'demo1',
      name: 'Vịnh Hạ Long',
      category: 'tour',
      type: 'play',
      lat: 20.9101,
      lng: 107.1839,
      desc: 'Di sản thiên nhiên thế giới',
      thumb: 'https://picsum.photos/400/300?random=1'
    },
    {
      id: 'demo2',
      name: 'Chợ đêm Hạ Long',
      category: 'service',
      type: 'eat',
      lat: 20.9508,
      lng: 107.0784,
      desc: 'Ẩm thực địa phương',
      thumb: 'https://picsum.photos/400/300?random=2'
    }
  ];
}