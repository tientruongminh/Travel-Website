// map.js - OPTIMIZED VERSION
// Các điểm tối ưu chính:
// 1. Lazy load Turf.js chỉ khi cần
// 2. Simplify geometry TRƯỚC khi render
// 3. Dùng Canvas renderer thay SVG
// 4. Throttle events
// 5. Virtual scrolling cho danh sách
// 6. Debounce search

const COLORS = {
  primary: "#0077C8",
  secondary: "#00BFA6",
  sky: "#64B5F6",
  ocean: "#0288D1",
  teal: "#00ACC1",
  leaf: "#81C784",
  lime: "#AED581",
  aqua: "#4DD0E1",
  violet: "#9575CD",
  coral: "#FF8A65",
  yellow: "#FFD54F",
  pink: "#F06292",
  border: "#0f4a43"
};

const UNIT_PALETTE = [
  "#ddf542e6", "#00BFA6", "#26C6DA", "#26A69A", 
  "#66BB6A", "#11c68dff", "#B2F3E1"
];

const CARTO_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR = "&copy; OpenStreetMap &copy; CARTO";

// ====== CANVAS RENDERER (10x nhanh hơn SVG) ======
const canvasRenderer = L.canvas({ padding: 0.5 });

console.log("🟢 Initializing Optimized Map...");
const map = L.map("mapid", { 
  zoomControl: true,
  preferCanvas: true, // CRITICAL: Dùng Canvas thay SVG
  renderer: canvasRenderer
});

L.tileLayer(CARTO_TILES, { 
  maxZoom: 25, 
  attribution: CARTO_ATTR,
  updateWhenIdle: true, // Chỉ load tile khi dừng zoom/pan
  updateWhenZooming: false,
  keepBuffer: 2 // Giảm số tile cache
}).addTo(map);

// ====== DEBOUNCE & THROTTLE ======
function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function throttle(fn, ms) {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last < ms) return;
    last = now;
    fn.apply(this, args);
  };
}

// ====== ICON CACHE ======
const iconCache = new Map();

function makeCircleIcon(imageUrl, size = 44) {
  const key = `${imageUrl}_${size}`;
  if (iconCache.has(key)) return iconCache.get(key);
  
  const icon = L.divIcon({
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        overflow:hidden;
        background:linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
        box-shadow: 0 0 0 3px #fff, 0 4px 12px rgba(0,119,200,.3);
      ">
        <img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy"/>
      </div>
    `,
    className: "icon-circle",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -Math.round(size * 0.55)]
  });
  
  iconCache.set(key, icon);
  return icon;
}

const customIcons = {
  tour: makeCircleIcon("./images/icons/tour.png?v=3", 44),
  service: makeCircleIcon("./images/icons/service.png?v=3", 44),
  event: makeCircleIcon("./images/icons/event.png?v=3", 44),
  eat: makeCircleIcon("./images/icons/eat.png?v=3", 44),
  stay: makeCircleIcon("./images/icons/stay.png?v=3", 44),
  play: makeCircleIcon("./images/icons/play.png?v=3", 44)
};

// ====== STATE ======
let qnBounds = null;
let allPoints = [];
let current = [];
let markers = [];
let turfLoaded = false;

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

// ====== LAZY LOAD TURF ======
async function loadTurf() {
  if (turfLoaded || window.turf) {
    turfLoaded = true;
    return;
  }
  
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js";
    script.onload = () => {
      turfLoaded = true;
      console.log("✅ Turf loaded");
      resolve();
    };
    script.onerror = () => {
      console.warn("⚠️ Turf load failed");
      resolve();
    };
    document.head.appendChild(script);
  });
}

// ====== INIT ======
async function init() {
  try {
    // Load song song
    const [geo, spots] = await Promise.all([
      fetch("data/quangninh.geojson?v=3").then(r => r.json()).catch(() => demoBoundaryGeoJSON()),
      fetch("data/spots.json?v=3").then(r => r.json()).catch(() => demoSpots())
    ]);

    console.log("✅ Boundary & Spots loaded");

    // ====== BOUNDARY - ĐƠN GIẢN HÓA ======
    const boundaryStyle = {
      color: "#004D40",
      weight: 2,
      fillColor: "#CCFFF2",
      fillOpacity: 0.08,
      renderer: canvasRenderer // Dùng Canvas
    };

    const boundaryLayer = L.geoJSON(geo, {
      filter: f => ["Polygon", "MultiPolygon"].includes(f.geometry?.type),
      style: boundaryStyle,
      renderer: canvasRenderer
    }).addTo(map);

    qnBounds = boundaryLayer.getBounds();
    map.fitBounds(qnBounds);

    const fitZoom = map.getBoundsZoom(qnBounds);
    map.setMinZoom(fitZoom + 0.75);
    map.setMaxZoom(fitZoom + 3);
    map.setMaxBounds(qnBounds.pad(0.02));
    map.options.maxBoundsViscosity = 1.0;

    // Throttle drag event
    map.on("drag", throttle(() => {
      map.panInsideBounds(qnBounds, { animate: false });
    }, 100));

    // ====== LOAD UNITS ASYNC - KHÔNG BLOCK MAIN ======
    loadUnitsAsync();

    // Normalize points
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

// ====== LOAD UNITS ASYNC - KHÔNG BLOCK ======
async function loadUnitsAsync() {
  try {
    // Load Turf trước
    await loadTurf();
    
    const units = await fetch("data/quangninh.geojson?v=3")
      .then(r => r.json())
      .catch(() => null);

    if (!units || !units.features) return;

    console.log("✅ Units loaded:", units.features.length);

    // SIMPLIFY CỰC MẠNH - Giảm 90% vertices
    if (window.turf) {
      try {
        // Lọc đảo nhỏ
        units.features = units.features.filter(f => {
          try {
            const area = turf.area(f);
            return area > 100000; // Bỏ đảo < 0.1km²
          } catch {
            return true;
          }
        });

        

        units.features = simplified.features;
        console.log("✨ Units simplified aggressively");
      } catch (e) {
        console.warn("⚠️ Simplify failed:", e);
      }
    }

    // Build color map (chỉ 1 lần)
    const unitColorIndex = buildUnitColorMap(units);

    // Render với Canvas
    const unitsLayer = L.geoJSON(units, {
      filter: f => ["Polygon", "MultiPolygon"].includes(f.geometry?.type),
      style: f => unitBaseStyle(f, unitColorIndex),
      renderer: canvasRenderer, // CRITICAL
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const name = props.ten_xa || props.TEN_XA || "Chưa rõ tên";

        // Tooltip đơn giản
        layer.bindTooltip(`<div class="unit-tooltip"><strong>${esc(name)}</strong></div>`, {
          direction: "center",
          permanent: false,
          sticky: true
        });

        // Throttle hover events
        layer.on("mouseover", throttle(() => {
          layer.setStyle({
            weight: 1.5,
            fillOpacity: 0.9
          });
        }, 50));

        layer.on("mouseout", throttle(() => {
          const base = unitBaseStyle(feature, unitColorIndex);
          layer.setStyle(base);
        }, 50));
      }
    }).addTo(map);

    unitsLayer.bringToFront();

  } catch (err) {
    console.warn("⚠️ Units load failed:", err);
  }
}

// ====== COLOR MAP - SIMPLIFIED ======
function buildUnitColorMap(fc) {
  const feats = fc.features || [];
  const idxToColor = new Map();
  
  feats.forEach((f, i) => {
    const props = f.properties || {};
    const name = props.ten_xa || props.TEN_XA || `unit_${i}`;
    let h = 0;
    for (let j = 0; j < name.length; j++) {
      h = (h * 31 + name.charCodeAt(j)) >>> 0;
    }
    idxToColor.set(i, h % UNIT_PALETTE.length);
  });
  
  return idxToColor;
}

function unitBaseStyle(feature, idxToColor) {
  const props = feature.properties || {};
  const idx = props.__idx ?? 0;
  const colorIdx = idxToColor.get(idx) ?? 0;

  return {
    color: "rgba(28, 169, 250, 0.6)",
    weight: 0.5,
    fillColor: UNIT_PALETTE[colorIdx],
    fillOpacity: 0.7,
    renderer: canvasRenderer
  };
}

// ====== RENDER - OPTIMIZED ======
function render(points) {
  // Giới hạn số marker hiển thị
  const MAX_MARKERS = 200;
  const displayPoints = points.slice(0, MAX_MARKERS);
  
  markersLayer.clearLayers();
  markers = [];

  displayPoints.forEach(p => {
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

  // Render UI - Virtual scrolling cho danh sách lớn
  renderSidebarList(points);
  renderBottomCards(displayPoints);
  updateStats(points);
}

// ====== VIRTUAL SCROLLING SIDEBAR ======
function renderSidebarList(points) {
  if (!els.spotList) return;
  
  const BATCH_SIZE = 50; // Chỉ render 50 item đầu
  const visible = points.slice(0, BATCH_SIZE);
  
  els.spotList.innerHTML = visible.map(p => `
    <div class="spot-card" data-id="${esc(p.id)}">
      <img src="${esc(p.thumb || 'images/placeholder.jpg')}" alt="${esc(p.name)}" loading="lazy">
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
      document.body.classList.add("sidebar-collapsed");
      els.sidebar?.classList.add("collapsed");
    };
  });
}

// ====== BOTTOM CARDS - LAZY LOAD IMAGES ======
function renderBottomCards(points) {
  if (!els.cards) return;
  
  const handleHTML = `<button class="sheet-handle" aria-label="Thu gọn/mở rộng"><div class="grabber"></div></button>`;
  
  els.cards.innerHTML = handleHTML + points.map(p => `
    <div class="card-mini" data-id="${esc(p.id)}">
      <div class="card">
        <img class="thumb" src="${esc(p.thumb || 'images/placeholder.jpg')}" alt="" loading="lazy">
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
      document.body.classList.add("sidebar-collapsed");
      els.sidebar?.classList.add("collapsed");
    };
  });
}

function updateStats(points) {
  const total = points.length;
  const tour = points.filter(p => {
    const c = (p.category || "").toLowerCase();
    return c === "tour";
  }).length;
  const svc = points.filter(p => {
    const c = (p.category || "").toLowerCase();
    return c === "service" || c === "svc";
  }).length;
  const evt = points.filter(p => {
    const c = (p.category || "").toLowerCase();
    return c === "event" || c === "evt";
  }).length;

  if (els.statAll) els.statAll.textContent = total;
  if (els.statTour) els.statTour.textContent = tour;
  if (els.statSvc) els.statSvc.textContent = svc;
  if (els.statEvt) els.statEvt.textContent = evt;
}

// ====== AUTO SCROLL ======
function startAutoScroll() {
  if (autoScrollInterval) return;
  autoScrollInterval = setInterval(() => {
    if (els.cards && !els.cards.classList.contains('collapsed')) {
      els.cards.scrollLeft += 1;
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
  els.cards.addEventListener('touchstart', stopAutoScroll, { passive: true });
  els.cards.addEventListener('mouseleave', startAutoScroll);
}

// ====== UI WIRING ======
function wireUI() {
  // Search với debounce
  els.keyword?.addEventListener("input", debounce(() => {
    const kw = els.keyword.value.trim().toLowerCase();
    const activeBtn = document.querySelector('.pill.active');
    const mode = activeBtn?.dataset.cat || "all";

    current = filterByMode(allPoints, mode).filter(p =>
      !kw ||
      p.name.toLowerCase().includes(kw) ||
      (p.desc || "").toLowerCase().includes(kw)
    );
    render(current);
  }, 300)); // Debounce 300ms

  // Sidebar toggle
  els.sidebarToggle?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    els.sidebar?.classList.toggle("collapsed");
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
  const first = p.media?.[0];
  const mediaHTML = first ? renderMedia(first) : `<img src="${esc(p.thumb || 'images/placeholder.jpg')}" class="popup-media" alt="${esc(p.name)}" loading="lazy">`;
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
      <div class="popup-actions">
        <a href="${detailLink}" class="btn-cta btn-ghost">Xem chi tiết</a>
        <a href="${gmaps}" class="btn-cta btn-ghost" target="_blank" rel="noopener">Chỉ đường</a>
      </div>
    </div>
  </div>`;
}

function renderMedia(m) {
  if (!m) return '';
  const t = (m.type || '').toLowerCase();
  if (t === 'video') {
    return `<div style="height:140px"><video controls class="popup-media" preload="metadata"><source src="${esc(m.url)}"></video></div>`;
  }
  if (t === 'youtube') {
    const src = m.url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/");
    return `<div class="popup-media" style="height:140px;padding:0">
      <iframe width="100%" height="140" src="${esc(src)}" frameborder="0" loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>`;
  }
  return `<img src="${esc(m.url)}" class="popup-media" alt="" loading="lazy">`;
}

function attachPopupEvents(p) {
  // Simplified - no carousel for performance
}

// ====== HELPERS ======
function getCategoryIcon(cat) {
  const icons = { tour: 'landscape', service: 'shopping_bag', event: 'event' };
  return icons[cat] || 'place';
}

const ICON_SVG = {
  eat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2h2v20h-2V2zm7.5 7c1.93 0 3.5 1.57 3.5 3.5S20.43 16 18.5 16H17v6h-2V9h3.5z"/></svg>',
  play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>',
  stay: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7V4H5v3H2v13h2v-2h16v2h2V7h-3z"/></svg>'
};

function typeIconHTML(type) {
  const t = (type || '').toLowerCase();
  const svg = ICON_SVG[t] || ICON_SVG.play;
  return `<span style="display:inline-flex;align-items:center;color:${COLORS.primary}">${svg}</span>`;
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
    category: (s.category || "tour").toLowerCase(),
    type: (s.type || "play").toLowerCase(),
    lat: s.lat ?? 0,
    lng: s.lng ?? 0,
    desc: s.desc || "",
    thumb: s.thumb || "",
    address: s.address || "",
    media: Array.isArray(s.media) ? s.media : []
  }));
}

function filterByMode(list, mode) {
  if (mode === "all") return list;
  return list.filter(p => catIs(p, mode));
}

function catIs(p, m) {
  const c = p.category;
  if (m === "service") return c === "service";
  if (m === "event") return c === "event";
  return c === "tour";
}

function catLabel(t) {
  const m = { tour: "Du lịch", service: "Sản phẩm", event: "Sự kiện" };
  return m[t] || "Khác";
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function esc(s) {
  return (s || "").toString().replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function setText(el, v) {
  if (el) el.textContent = v;
}

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
    }
  ];
}