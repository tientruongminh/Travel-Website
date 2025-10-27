// map.js v5 — Colored icons + 54 units fill, no clustering, auto-scroll, better UX
// đặt ở đầu file map.js
const turfScript = document.createElement('script');
turfScript.src = "https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js";
turfScript.onload = () => console.log("✅ Turf loaded");
document.head.appendChild(turfScript);

const CARTO_VOYAGER = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTR = "&copy; OpenStreetMap &copy; CARTO";

console.log("🟡 boot map…");
const map = L.map("mapid", { zoomControl: true });
L.tileLayer(CARTO_VOYAGER, { maxZoom: 22, attribution: CARTO_ATTR }).addTo(map);

/* ---------------- Colored icons ---------------- */
function makeIcon(bg, imageUrl) {
  return L.divIcon({
    html: `
      <div style="
        width:36px;height:36px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        background:${bg};
        border:2px solid rgba(255,255,255,.95);
        box-shadow:0 6px 14px rgba(0,0,0,.18);
        transform: translateY(-6px);
        overflow: hidden;
      ">
        <img src="${imageUrl}" style="width:20px;height:20px;object-fit:contain;" />
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

const customIcons = {
  tour:    makeIcon("#22c55e", "./images/icons/tour.png"),
  service: makeIcon("#f59e0b", "./images/icons/service.png"),
  event:   makeIcon("#ef4444", "./images/icons/event.png"),
  eat:     makeIcon("#8b5cf6", "./images/icons/eat.png"),
  stay:    makeIcon("#06b6d4", "./images/icons/stay.png"),
  play:    makeIcon("#3b82f6", "./images/icons/play.png")
};

/* ---------------- State ---------------- */
let qnBounds = null;
let allPoints = [];
let current = [];
let markers = [];

const markersLayer = L.layerGroup();
map.addLayer(markersLayer);

/* ---------------- UI refs ---------------- */
const els = {
  cards: document.getElementById("cards"),
  spotList: document.getElementById("spot-list"),
  statAll: document.getElementById("stat-all"),
  statTour: document.getElementById("stat-tour"),
  statSvc: document.getElementById("stat-svc"),
  statEvt: document.getElementById("stat-evt"),
  keyword: document.getElementById("keyword"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  cardsToggle: document.getElementById("cardsToggle"),
  sidebar: document.getElementById("sidebar")
};

let autoScrollInterval = null;

init();

async function init() {
  try {
    const boundaryP = fetch("data/quangninh.geojson?v=3").then(r => r.json());
    const spotsP    = fetch("data/spots.json?v=3").then(r => r.json());
    const unitsP    = fetch("data/quang_ninh_54units.geojson?v=1").then(r => r.json()).catch(() => null);

    let geo, spots, units;
    try { geo = await boundaryP; console.log("✅ boundary loaded"); }
    catch { console.warn("⚠️ boundary fetch failed → demo polygon"); geo = demoBoundaryGeoJSON(); }

    try { spots = await spotsP; console.log("✅ spots loaded:", spots?.length ?? 0); }
    catch { console.warn("⚠️ spots fetch failed → demo spots"); spots = demoSpots(); }

    try { units = await unitsP; console.log("✅ units loaded:", units?.features?.length ?? 0); }
    catch { units = null; }
    
    // Boundary layer
    const boundaryLayer = L.geoJSON(geo, {
      filter: f => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon",
      style: { color: "#1b6a63", weight: 2, fillColor: "#aee0d9", fillOpacity: .15 }
    }).addTo(map);

    // Fit and lock inside Quảng Ninh
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

    /* ====== 54 đơn vị: tô màu khác nhau theo tên ====== */
    function hashColor(str) {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      const hue = h % 360;
      return `hsl(${hue}, 70%, 68%)`;
    }

    let unitsLayer = null;
    if (units && units.type === "FeatureCollection") {
      unitsLayer = L.geoJSON(units, {
        filter: f => ["Polygon","MultiPolygon"].includes(f.geometry?.type),
        style: f => {
          const name = f.properties?.unit_54_name || "unit";
          return {
            color: "#0f4a43",
            weight: 1,
            fillColor: hashColor(name),
            fillOpacity: 0.55
          };
        },
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.unit_54_name || "Chưa rõ";
          const type = feature.properties?.unit_54_type || "";
          layer.bindTooltip(`${name}${type ? " • " + type : ""}`, {
            direction: "center",
            permanent: false,
            sticky: true,
            className: "unit-label"
          });
          layer.on("mouseover", () => layer.setStyle({ weight: 2, fillOpacity: 0.7 }));
          layer.on("mouseout",  () => layer.setStyle({ weight: 1, fillOpacity: 0.55 }));
          layer.on("click",     () => map.fitBounds(layer.getBounds().pad(0.05), { animate: true }));
        }
      }).addTo(map);
      unitsLayer.bringToFront();
    }

    // Normalize points
    const userPoints = JSON.parse(localStorage.getItem("qn_user_points") || "[]");
    allPoints = normalizeSpots(spots).concat(normalizeSpots(userPoints));
    current = allPoints.slice();

    console.log("✅ map ready. points:", current.length);
    render(current);
    wireUI();
    startAutoScroll();
  } catch (err) {
    console.error("❌ init failed:", err);
  }
}

/* ---------------- Render ---------------- */
function render(points) {
  // Clear markers
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
          <div class="spot-meta">
            <span class="material-icons">${getCategoryIcon(p.category)}</span>
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
          map.flyTo([spot.lat, spot.lng], Math.max(map.getZoom(), map.getMinZoom() + 2), { duration: .8 });
          const mk = markers.find(m => m._meta?.id === id);
          if (mk) mk.openPopup();
        }
      };
    });
  }

  // Bottom rail cards
  if (els.cards) {
    els.cards.innerHTML = points.map(p => `
      <div class="card-mini" data-id="${esc(p.id)}">
        <div class="card">
          <img class="thumb" src="${esc(p.thumb || 'images/placeholder.jpg')}" alt="">
          <div>
            <div class="card-icon">${getTypeIcon(p.type)}</div>
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
          map.flyTo([spot.lat, spot.lng], Math.max(map.getZoom(), map.getMinZoom() + 2), { duration: .8 });
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
  const svc  = points.filter(p => catIs(p, "service")).length;
  const evt  = points.filter(p => catIs(p, "event")).length;

  setText(els.statAll, total);
  setText(els.statTour, tour);
  setText(els.statSvc,  svc);
  setText(els.statEvt,  evt);
}

/* ---------------- Auto Scroll ---------------- */
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

/* ---------------- UI Wiring ---------------- */
function wireUI() {
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

  // Sidebar button icon sync
  const btn = els.sidebarToggle;
  const syncToggle = () => {
    const isClosed = els.sidebar?.classList?.contains('collapsed');
    if (!btn) return;
    btn.innerHTML = `<span class="material-icons">${isClosed ? 'chevron_left' : 'menu'}</span>`;
    btn.setAttribute('aria-label', isClosed ? 'Mở sidebar' : 'Đóng sidebar');
  };
  btn?.addEventListener('click', () => {
    els.sidebar?.classList?.toggle('collapsed');
    syncToggle();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && els.sidebar && !els.sidebar.classList.contains('collapsed')) {
      els.sidebar.classList.add('collapsed');
      syncToggle();
    }
  });
  syncToggle();

  // Cards rail toggle
  els.cardsToggle?.addEventListener('click', () => {
    els.cards.classList.toggle('collapsed');
    els.cardsToggle.classList.toggle('active');
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName === 'explore') window.location.href = 'explore.html';
      else if (tabName === 'upload') window.location.href = 'upload.html';
      else if (tabName === 'map') {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      }
    });
  });
}

/* ---------------- Popup Builder ---------------- */
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
        <span class="material-icons" style="font-size:16px;color:#1f8175">place</span>
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

/* ---------------- Icon Helpers ---------------- */
function getCategoryIcon(cat) {
  const icons = { tour: 'landscape', service: 'restaurant', event: 'event', svc: 'restaurant', evt: 'event' };
  return icons[cat] || 'place';
}
function getTypeIcon(type) {
  const icons = { eat: '🍽️', play: '🎡', stay: '🏨' };
  return icons[type] || '📍';
}

/* ---------------- Helpers ---------------- */
const ICON_SVG = {
  eat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2h2v20h-2V2zm7.5 7c1.93 0 3.5 1.57 3.5 3.5S20.43 16 18.5 16H17v6h-2V9h3.5zM9 7v6c0 2.21-1.79 4-4 4H4v5H2V3h2v6h1c1.66 0 3-1.34 3-3V3h2v4z"/></svg>',
  play:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>',
  stay:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7V4H5v3H2v13h2v-2h16v2h2V7h-3zM5 18v-5h14v5H5zm0-7V6h14v5H5z"/></svg>'
};

function typeIconHTML(type) {
  const t = (type || '').toLowerCase();
  const svg = ICON_SVG[t] || ICON_SVG.play;
  return `<span style="display:inline-flex;align-items:center;gap:6px;color:#1f8175">${svg}</span>`;
}
function typeBadgeClass(type) {
  const t = (type || '').toLowerCase();
  if (t === 'eat') return 'popup-badge badge-eat';
  if (t === 'stay') return 'popup-badge badge-stay';
  return 'popup-badge badge-play';
}
function googleMapsLink(lat, lng) { return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`; }

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

function filterByMode(list, mode) { if (mode === "all") return list; return list.filter(p => catIs(p, mode)); }

function catIs(p, m) {
  const c = (p.category || "").toLowerCase();
  if (m === "service" || m === "svc") return c === "service" || c === "svc";
  if (m === "event"   || m === "evt") return c === "event"   || c === "evt";
  if (m === "tour") return c === "tour";
  return false;
}

function catLabel(t, cap = false) {
  const m = { tour: "Du lịch", service: "Sản phẩm", event: "Sự kiện", evt: "Sự kiện", svc: "Sản phẩm" };
  return m[t] || (cap ? "Khác" : "khác");
}

function rid() { return Math.random().toString(36).slice(2, 10); }
function esc(s) { return (s || "").toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function setText(el, v) { if (el) el.textContent = v; }

/* ---------------- Demo fallbacks ---------------- */
function demoBoundaryGeoJSON() {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[107.0, 20.8],[107.5,20.8],[107.5,21.3],[107.0,21.3],[107.0,20.8]]] }
    }]
  };
}
function demoSpots() {
  return [
    { id: 'demo1', name: 'Vịnh Hạ Long', category: 'tour', type: 'play', lat: 20.9101, lng: 107.1839, desc: 'Di sản thiên nhiên thế giới', thumb: 'https://picsum.photos/400/300?random=1' },
    { id: 'demo2', name: 'Chợ đêm Hạ Long', category: 'service', type: 'eat', lat: 20.9508, lng: 107.0784, desc: 'Ẩm thực địa phương', thumb: 'https://picsum.photos/400/300?random=2' }
  ];
}