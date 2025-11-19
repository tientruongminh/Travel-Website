// map.js - FULL OPTIMIZED VERSION WITH SMART DENSITY COLORING
// ⚡ PERFORMANCE OPTIMIZATIONS:
// - Progressive loading (spots → boundary → units)
// - Deferred rendering (non-critical UI)
// - RequestAnimationFrame for smooth rendering
// - Fragment API for fast DOM operations
// - Async background tasks
// - Reduced batch sizes

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

// ====== BẢNG MÀU BASE CHO DENSITY (Base colors) ======
const DENSITY_BASE_COLORS = [
  "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#00BCD4",
  "#E91E63", "#8BC34A", "#FFC107", "#009688", "#673AB7"
];

const CARTO_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR = "&copy; OpenStreetMap &copy; CARTO";

// ====== CANVAS RENDERER ======
const canvasRenderer = L.canvas({ padding: 0.5 });

console.log("🟢 Initializing Map with Smart Density Coloring...");
const map = L.map("mapid", { 
  zoomControl: true,
  preferCanvas: true,
  renderer: canvasRenderer,
  zoomAnimation: true,
  fadeAnimation: true,
  markerZoomAnimation: true,
  zoomAnimationThreshold: 4
});

L.tileLayer(CARTO_TILES, { 
  maxZoom: 25, 
  attribution: CARTO_ATTR,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2
}).addTo(map);

// ====== INJECT CSS STYLES ======
if (!document.getElementById('marker-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'marker-styles';
  styleEl.textContent = `
    /* CSS Marker Animations */
    .css-marker-wrapper:hover .css-marker {
      transform: scale(1.15) translateY(-3px);
      box-shadow: 0 0 0 4px #fff, 
                  0 8px 24px rgba(0, 0, 0, 0.3),
                  0 0 0 1px rgba(0,0,0,0.1) inset;
    }

    .css-marker-wrapper:active .css-marker {
      transform: scale(1.05) translateY(0);
    }

    @keyframes marker-pulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.1); opacity: 0.4; }
    }

    .css-marker.active::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: inherit;
      animation: marker-pulse 2s ease-in-out infinite;
      z-index: -1;
    }

    /* Label styles */
    .unit-label {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      text-shadow: 
        2px 2px 3px rgba(255,255,255,0.95),
        -2px -2px 3px rgba(255,255,255,0.95),
        2px -2px 3px rgba(255,255,255,0.95),
        -2px 2px 3px rgba(255,255,255,0.95),
        0 0 8px rgba(255,255,255,0.9);
      pointer-events: none;
      white-space: nowrap;
      transition: opacity 0.3s ease;
      letter-spacing: 0.3px;
    }

    /* Tooltip styles */
    .unit-tooltip {
      background: #ffffff;
      padding: 0;
      border-radius: 10px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.10);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-width: 160px;
      max-width: 220px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      overflow: hidden;
      font-size: 12px;
      position: relative;
    }

    .unit-tooltip .popup-logo {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,0.9);
      box-shadow: 0 4px 10px rgba(0,0,0,0.12);
      z-index: 4;
      pointer-events: none;
      background: white;
    }

    .tooltip-header {
      background: linear-gradient(135deg, #0ea5e9 0%, #0f766e 100%);
      padding: 8px 10px;
      color: white;
    }

    .tooltip-title {
      font-size: 13px;
      font-weight: 700;
      margin: 0;
      line-height: 1.2;
    }

    .tooltip-body {
      padding: 8px 10px;
    }

    .density-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 6px;
      color: white;
      background: rgba(255, 255, 255, 0.14);
    }

    .tooltip-info-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px 12px;
      margin: 12px 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .info-label {
      color: #64748b;
      font-weight: 500;
    }

    .info-value {
      color: #1e293b;
      font-weight: 600;
      text-align: right;
    }

    .tooltip-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 12px 0;
    }

    .tooltip-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 12px;
    }

    .stat-item {
      text-align: center;
      padding: 10px 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .stat-item:hover {
      transform: translateY(-2px);
    }

    .stat-tour { 
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    }
    
    .stat-service { 
      background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    }
    
    .stat-event { 
      background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    }

    .stat-icon {
      font-size: 18px;
      display: block;
      margin-bottom: 4px;
    }

    .stat-number {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      display: block;
    }

    .stat-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
  `;
  document.head.appendChild(styleEl);
}

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

// ====== CSS MARKERS ======
function makeCSSIcon(category, size = 44) {
  const key = `${category}_${size}`;
  if (iconCache.has(key)) return iconCache.get(key);
  
  const styles = {
    tour: {
      gradient: 'linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%)',
      icon: 'images/icons/tour.png',
      shadow: 'rgba(2, 3, 3, 0.4)'
    },
    service: {
      gradient: 'linear-gradient(135deg, #FFA726 0%, #FB8C00 100%)',
      icon: 'images/icons/eat.png',
      shadow: 'rgba(255, 152, 0, 0.4)'
    },
    event: {
      gradient: 'linear-gradient(135deg, #AB47BC 0%, #8E24AA 100%)',
      icon: 'images/icons/event.png',
      shadow: 'rgba(156, 39, 176, 0.4)'
    },
    eat: {
      gradient: 'linear-gradient(135deg, #EF5350 0%, #E53935 100%)',
      icon: 'images/icons/eat.png',
      shadow: 'rgba(244, 67, 54, 0.4)'
    },
    stay: {
      gradient: 'linear-gradient(135deg, #26A69A 0%, #00897B 100%)',
      icon: '🏨',
      shadow: 'rgba(0, 150, 136, 0.4)'
    },
    play: {
      gradient: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
      icon: '⛵',
      shadow: 'rgba(76, 175, 80, 0.4)'
    }
  };
  
  const style = styles[category] || styles.tour;
  
  let markerBgStyle = '';
  let iconInner = '';
  if (typeof style.icon === 'string' && (style.icon.endsWith('.png') || style.icon.endsWith('.jpg') || style.icon.endsWith('.jpeg') || style.icon.endsWith('.svg') || style.icon.includes('/images/'))) {
    markerBgStyle = `background-image: url('${style.icon}'); background-size: cover; background-position: center;`;
    iconInner = '';
  } else {
    markerBgStyle = `background: ${style.gradient};`;
    iconInner = style.icon || '';
  }

  const icon = L.divIcon({
    html: `
      <div class="css-marker-wrapper" style="width:${size}px;height:${size}px">
        <div class="css-marker" style="
          width:${size}px;
          height:${size}px;
          ${markerBgStyle}
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:${size * 0.5}px;
          box-shadow: 0 4px 12px ${style.shadow},
                      0 0 0 1px rgba(0,0,0,0.1) inset;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        ">
          ${iconInner}
        </div>
      </div>
    `,
    className: "css-icon-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -Math.round(size * 0.55)]
  });
  
  iconCache.set(key, icon);
  return icon;
}

const customIcons = {
  tour: makeCSSIcon("tour", 44),
  service: makeCSSIcon("service", 44),
  event: makeCSSIcon("event", 44),
  eat: makeCSSIcon("eat", 44),
  stay: makeCSSIcon("stay", 44),
  play: makeCSSIcon("play", 44)
};

// ====== STATE ======
let qnBounds = null;
let allPoints = [];
let current = [];
let markers = [];
let turfLoaded = false;
let labelsLayer = null;
let unitsStatsMap = new Map();
let maxPointsPerUnit = 0;
let provinceMaskLayer = null;
let provinceFlagMarker = null;

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

// ====== INIT - PROGRESSIVE LOADING ======
async function init() {
  try {
    // PRIORITY 1: Load spots first (critical for UI)
    const spots = await fetch("data/spots.json?v=3").then(r => r.json()).catch(() => demoSpots());
    
    // Normalize and render immediately
    const userPoints = JSON.parse(localStorage.getItem("qn_user_points") || "[]");
    allPoints = normalizeSpots(spots).concat(normalizeSpots(userPoints));
    current = allPoints.slice();
    
    console.log("✅ Points loaded:", current.length);
    render(current);
    wireUI();
    startAutoScroll();

    // PRIORITY 2: Load boundary (needed for map bounds)
    const geo = await fetch("data/quangninh.geojson?v=3").then(r => r.json()).catch(() => demoBoundaryGeoJSON());
    
    console.log("✅ Boundary loaded");

    const boundaryStyle = {
      color: "transparent",
      weight: 0,
      fillColor: "#1469CF",
      fillOpacity: 0.08,
      renderer: canvasRenderer
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
    
    map.setMaxBounds(qnBounds.pad(0.1));
    map.options.maxBoundsViscosity = 0.5;

    map.on("drag", throttle(() => {
      // Light constraint - only prevent extreme panning
      const currentCenter = map.getCenter();
      if (qnBounds && !qnBounds.pad(0.05).contains(currentCenter)) {
        const bounded = qnBounds.getCenter();
        map.panTo(bounded, { animate: false });
      }
    }, 150));
    
    // PRIORITY 3: Load units in background (non-blocking)
    setTimeout(() => loadUnitsAsyncWithDensity(), 100);
    
  } catch (err) {
    console.error("❌ Init failed:", err);
  }
}

// ====== GRAPH COLORING ======
function assignColorsToUnits(geojson) {
  const features = geojson.features || [];
  const n = features.length;
  
  console.log("🎨 Starting Graph Coloring for", n, "units...");
  
  const adjacencyList = buildAdjacencyGraph(features);
  const colors = new Array(n).fill(-1);
  
  for (let i = 0; i < n; i++) {
    const usedColors = new Set();
    for (const neighborIdx of adjacencyList[i]) {
      if (colors[neighborIdx] !== -1) {
        usedColors.add(colors[neighborIdx]);
      }
    }
    
    let color = 0;
    while (usedColors.has(color)) {
      color++;
    }
    
    colors[i] = color % DENSITY_BASE_COLORS.length;
  }
  
  features.forEach((f, i) => {
    f.properties = f.properties || {};
    f.properties.__colorIndex = colors[i];
  });
  
  console.log(`✅ Graph Coloring complete: ${Math.max(...colors) + 1} colors used`);
  return colors;
}

function buildAdjacencyGraph(features) {
  const n = features.length;
  const adjacencyList = Array.from({ length: n }, () => []);
  const bboxes = features.map(f => getBBox(f.geometry));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (bboxesOverlap(bboxes[i], bboxes[j])) {
        if (sharesBoundary(features[i].geometry, features[j].geometry)) {
          adjacencyList[i].push(j);
          adjacencyList[j].push(i);
        }
      }
    }
  }
  
  return adjacencyList;
}

function getBBox(geometry) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  const processCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      minX = Math.min(minX, coords[0]);
      maxX = Math.max(maxX, coords[0]);
      minY = Math.min(minY, coords[1]);
      maxY = Math.max(maxY, coords[1]);
    } else {
      coords.forEach(processCoords);
    }
  };
  
  processCoords(geometry.coordinates);
  return { minX, minY, maxX, maxY };
}

function bboxesOverlap(a, b) {
  return !(a.maxX < b.minX || b.maxX < a.minX || 
           a.maxY < b.minY || b.maxY < a.minY);
}

function sharesBoundary(geom1, geom2) {
  const coords1 = extractAllCoords(geom1);
  const coords2 = extractAllCoords(geom2);
  const threshold = 0.0001;
  
  for (const c1 of coords1) {
    for (const c2 of coords2) {
      const dist = Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) + 
        Math.pow(c1[1] - c2[1], 2)
      );
      if (dist < threshold) return true;
    }
  }
  
  return false;
}

function extractAllCoords(geometry) {
  const coords = [];
  const processCoords = (arr) => {
    if (typeof arr[0] === 'number') {
      coords.push(arr);
    } else {
      arr.forEach(processCoords);
    }
  };
  processCoords(geometry.coordinates);
  return coords;
}

// ====== DENSITY CALCULATIONS ======
function calculateAllUnitsStats(features, allPoints) {
  console.log("📊 Calculating density for all units...");
  
  unitsStatsMap.clear();
  maxPointsPerUnit = 0;
  
  const useSpatialMatch = window.turf && turfLoaded;
  
  features.forEach((feature, idx) => {
    const props = feature.properties || {};
    const name = props.ten_xa || props.TEN_XA || `unit_${idx}`;
    
    let pointsInUnit = [];
    
    if (useSpatialMatch) {
      try {
        pointsInUnit = allPoints.filter(p => {
          const point = turf.point([p.lng, p.lat]);
          return turf.booleanPointInPolygon(point, feature);
        });
      } catch (e) {
        console.warn(`⚠️ Spatial match failed for ${name}:`, e);
        pointsInUnit = [];
      }
    } else {
      pointsInUnit = allPoints.filter(p => {
        const addr = (p.address || '').toLowerCase();
        const nameLower = name.toLowerCase();
        
        if (addr.includes(nameLower)) return true;
        
        const nameWords = nameLower.split(' ').filter(w => w.length > 2);
        return nameWords.some(word => addr.includes(word));
      });
    }
    
    const tour = pointsInUnit.filter(p => p.category === 'tour').length;
    const service = pointsInUnit.filter(p => p.category === 'service').length;
    const event = pointsInUnit.filter(p => p.category === 'event').length;
    
    const stats = { total: pointsInUnit.length, tour, service, event };
    unitsStatsMap.set(name, stats);
    
    if (stats.total > maxPointsPerUnit) {
      maxPointsPerUnit = stats.total;
    }
    
    if (stats.total > 0) {
      console.log(`  ✓ ${name}: ${stats.total} điểm (${tour}T/${service}S/${event}E)`);
    }
  });
  
  console.log(`📊 Density calculated. Max points per unit: ${maxPointsPerUnit}`);
  console.log(`📊 Units with points: ${Array.from(unitsStatsMap.values()).filter(s => s.total > 0).length}/${features.length}`);
}

// ====== DENSITY COLOR CALCULATOR ======
function getDensityColor(baseColor, pointCount) {
  if (maxPointsPerUnit === 0) {
    return { color: baseColor, opacity: 0.5 };
  }
  
  const ratio = pointCount / maxPointsPerUnit;
  const opacity = 0.5 + (ratio * 0.45);
  
  return {
    color: baseColor,
    opacity: Math.min(Math.max(opacity, 0.5), 0.95)
  };
}

function getDensityLabel(pointCount) {
  if (maxPointsPerUnit === 0) return 'Không có dữ liệu';
  
  const ratio = pointCount / maxPointsPerUnit;
  
  if (ratio === 0) return 'Chưa có điểm';
  if (ratio < 0.2) return 'Rất thưa';
  if (ratio < 0.4) return 'Thưa';
  if (ratio < 0.6) return 'Trung bình';
  if (ratio < 0.8) return 'Đông';
  return 'Rất đông';
}

function buildUnitTooltipContent(unitName, stats, props) {
  const densityLabel = getDensityLabel(stats.total);
  const densityColor = getDensityColor(DENSITY_BASE_COLORS[0], stats.total);
  
  const maXa = props?.ma_xa || 'Đang cập nhật';
  const dienTich = props?.dtich_km2 ? props.dtich_km2.toFixed(1) : 'N/A';
  const danSo = props?.dan_so ? props.dan_so.toLocaleString('vi-VN') : 'N/A';
  
  return `
    <div class="unit-tooltip">
      <img class="popup-logo" src="images/logo_doan.png" alt="Logo Đoàn" />
      <div class="tooltip-header">
        <div class="tooltip-title">${esc(unitName)}</div>
        <div class="density-indicator" style="background: linear-gradient(135deg, ${densityColor.color}dd, ${densityColor.color});">
          <span>${densityLabel}</span>
          <strong style="margin-left: 4px;">${stats.total} điểm</strong>
        </div>
      </div>
      
      <div class="tooltip-body">
        <div class="tooltip-info-grid">
          <span class="info-label">Mã xã</span>
          <span class="info-value">${esc(maXa)}</span>
          
          <span class="info-label">Diện tích</span>
          <span class="info-value">${dienTich} km²</span>
          
          <span class="info-label">Dân số</span>
          <span class="info-value">${danSo} người</span>
        </div>
        
        ${stats.total > 0 ? `
          <div class="tooltip-divider"></div>
          <div class="tooltip-stats">
            <div class="stat-item stat-tour">
              <span class="stat-icon">🏖️</span>
              <span class="stat-number">${stats.tour}</span>
              <div class="stat-label">Du lịch</div>
            </div>
            <div class="stat-item stat-service">
              <span class="stat-icon">🛍️</span>
              <span class="stat-number">${stats.service}</span>
              <div class="stat-label">Sản phẩm</div>
            </div>
            <div class="stat-item stat-event">
              <span class="stat-icon">🎉</span>
              <span class="stat-number">${stats.event}</span>
              <div class="stat-label">Sự kiện</div>
            </div>
          </div>
        ` : '<div style="padding: 12px 0; text-align: center; color: #94a3b8; font-size: 13px;">Chưa có dữ liệu điểm</div>'}
      </div>
    </div>
  `;
}

// ====== LABELS ======
function updateLabelsVisibility() {
  const zoom = map.getZoom();
  const minZoom = map.getMinZoom();
  const shouldShowLabels = zoom > minZoom + 1.5;
  
  if (labelsLayer) {
    labelsLayer.eachLayer(layer => {
      const el = layer.getElement();
      if (el) {
        el.style.opacity = shouldShowLabels ? '1' : '0';
      }
    });
  }
}

function createUnitLabels(unitsLayer) {
  if (labelsLayer) {
    map.removeLayer(labelsLayer);
  }
  
  labelsLayer = L.layerGroup().addTo(map);
  
  unitsLayer.eachLayer(layer => {
    const feature = layer.feature;
    const props = feature.properties || {};
    const name = props.ten_xa || props.TEN_XA || "Chưa rõ tên";
    
    let center;
    try {
      if (window.turf && turfLoaded) {
        const centroid = turf.centroid(feature);
        center = L.latLng(
          centroid.geometry.coordinates[1],
          centroid.geometry.coordinates[0]
        );
      } else {
        center = layer.getBounds().getCenter();
      }
    } catch {
      center = layer.getBounds().getCenter();
    }
    
    const label = L.marker(center, {
      icon: L.divIcon({
        className: 'unit-label',
        html: `<span>${esc(name)}</span>`,
        iconSize: [0, 0]
      })
    });
    
    label.addTo(labelsLayer);
  });
  
  updateLabelsVisibility();
}

// ====== PROVINCE MASK ======
async function addProvinceMask(unitsGeo) {
  try {
    if (!unitsGeo || !unitsGeo.features || unitsGeo.features.length === 0) return;
    if (!window.turf) await loadTurf();

    const world = turf.polygon([[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]]);

    let provinceUnion = unitsGeo.features[0];
    for (let i = 1; i < unitsGeo.features.length; i++) {
      try {
        provinceUnion = turf.union(provinceUnion, unitsGeo.features[i]);
      } catch (e) {}
    }

    let mask = null;
    try {
      mask = turf.difference(world, provinceUnion || unitsGeo.features[0]);
    } catch (e) {
      console.warn('⚠️ province mask difference failed:', e);
    }

    if (!mask) {
      const holes = [];
      unitsGeo.features.forEach(f => {
        if (!f.geometry) return;
        if (f.geometry.type === 'Polygon') {
          holes.push(f.geometry.coordinates[0]);
        } else if (f.geometry.type === 'MultiPolygon') {
          f.geometry.coordinates.forEach(ring => holes.push(ring[0]));
        }
      });

      mask = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: holes.map(h => [h])
        }
      };
    }

    if (!map.getPane('provinceMaskPane')) {
      map.createPane('provinceMaskPane');
      const p = map.getPane('provinceMaskPane');
      p.style.zIndex = 350;
      p.style.pointerEvents = 'none';
    }

    provinceMaskLayer = L.geoJSON(mask, {
      pane: 'provinceMaskPane',
      style: {
        color: 'transparent',
        weight: 0,
        fillColor: '#D3ECFF',
        fillOpacity: 1,
        fillRule: 'evenodd'
      },
      interactive: false
    }).addTo(map);

    try { provinceMaskLayer.bringToBack(); } catch (e) {}

    console.log('✅ Province mask added');

    // Add flag/logo
    try {
      let centerLatLng = null;

      try {
        if (unitsGeo && unitsGeo.features && unitsGeo.features.length) {
          const preferredRegex = /k[yỳ][\s_-]*thuong/i;
          const match = unitsGeo.features.find(f => {
            const p = f.properties || {};
            const name = (p.ten_xa || p.TEN_XA || p.name || '').toString();
            return preferredRegex.test(name);
          });
          if (match && window.turf) {
            try {
              const c = turf.centroid(match);
              centerLatLng = L.latLng(c.geometry.coordinates[1], c.geometry.coordinates[0]);
            } catch (e) {}
          }
        }
      } catch (e) {}

      if (!centerLatLng) {
        if (provinceUnion && window.turf) {
          try {
            const c = turf.centroid(provinceUnion);
            centerLatLng = L.latLng(c.geometry.coordinates[1], c.geometry.coordinates[0]);
          } catch (e) { centerLatLng = null; }
        }
      }

      if (!centerLatLng) {
        try {
          if (unitsGeo && unitsGeo.features && unitsGeo.features.length) {
            const bb = turf.bbox(unitsGeo);
            const center = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
            centerLatLng = L.latLng(center[1], center[0]);
          }
        } catch (e) {
          try { centerLatLng = map.getBounds().getCenter(); } catch (e) { centerLatLng = null; }
        }
      }

      if (centerLatLng) {
        if (!map.getPane('provinceFlagPane')) {
          map.createPane('provinceFlagPane');
          const fp = map.getPane('provinceFlagPane');
          fp.style.zIndex = 600;
          fp.style.pointerEvents = 'none';
        }

        

        try { if (provinceFlagMarker) { map.removeLayer(provinceFlagMarker); provinceFlagMarker = null; } } catch(e){}

        provinceFlagMarker = L.marker(centerLatLng, { icon: flagIcon, interactive: false, pane: 'provinceFlagPane' }).addTo(map);
        try { provinceFlagMarker.bringToFront(); } catch (e) {}
      }
    } catch (e) {
      console.warn('⚠️ add province flag failed:', e);
    }
  } catch (err) {
    console.warn('⚠️ addProvinceMask failed:', err);
  }
}

// ====== LOAD UNITS WITH DENSITY ======
async function loadUnitsAsyncWithDensity() {
  try {
    // Load Turf in background
    loadTurf().catch(() => {});
    
    const units = await fetch("data/quangninh.geojson?v=3")
      .then(r => r.json())
      .catch(() => null);

    if (!units || !units.features) return;

    console.log("✅ Units loaded:", units.features.length);

    // Skip simplification if Turf not ready yet
    if (window.turf) {
      try {
        units.features = units.features.filter(f => {
          try {
            const area = turf.area(f);
            return area > 100000;
          } catch {
            return true;
          }
        });

        const simplified = turf.simplify(units, {
          tolerance: 0.001,
          highQuality: false
        });

        units.features = simplified.features;
        console.log("✨ Units simplified");
      } catch (e) {
        console.warn("⚠️ Simplify skipped:", e);
      }
    }

    // Calculate density (fast operation)
    calculateAllUnitsStats(units.features, allPoints);

    // Assign colors (fast operation)
    assignColorsToUnits(units);

    const unitsLayer = L.geoJSON(units, {
      filter: f => ["Polygon", "MultiPolygon"].includes(f.geometry?.type),
      style: (f) => {
        const props = f.properties || {};
        const name = props.ten_xa || props.TEN_XA || "Chưa rõ tên";
        const colorIndex = props.__colorIndex || 0;
        const baseColor = DENSITY_BASE_COLORS[colorIndex];

        const stats = unitsStatsMap.get(name) || { total: 0 };
        const densityColor = getDensityColor(baseColor, stats.total);

        props.__densityColor = densityColor;

        return {
          color: "rgba(148, 163, 184, 1)",
          weight: 0.6,
          fillColor: "#1469CF",
          fillOpacity: 1,
          renderer: canvasRenderer
        };
      },
      renderer: canvasRenderer,
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const name = props.ten_xa || props.TEN_XA || "Chưa rõ tên";

        const stats = unitsStatsMap.get(name) || { total: 0, tour: 0, service: 0, event: 0 };
        const tooltipContent = buildUnitTooltipContent(name, stats, props);

        layer.bindTooltip(tooltipContent, {
          direction: 'auto',
          permanent: false,
          sticky: true,
          offset: [110, 0],
          className: 'custom-tooltip'
        });

        let __hoverTimeout = null;

        layer.on("mouseover", (e) => {
          if (__hoverTimeout) { clearTimeout(__hoverTimeout); __hoverTimeout = null; }

          if (!layer.__origStyle) {
            const o = layer.options || {};
            layer.__origStyle = {
              color: o.color || "rgba(148, 163, 184, 1)",
              weight: (o.weight != null) ? o.weight : 0.6,
              fillColor: o.fillColor || "#006A2E",
              fillOpacity: (o.fillOpacity != null) ? o.fillOpacity : 1
            };
          }

          layer.setStyle({
            weight: 2,
            color: "rgba(20, 60, 30, 1)",
            fillColor: "#FFD54F",
            fillOpacity: 1
          });

          try { layer.bringToFront(); } catch (e) {}
          try { if (provinceMaskLayer) provinceMaskLayer.setStyle({ fillColor: '#BFE6FF' }); } catch (e) {}
        });

        layer.on("mouseout", () => {
          __hoverTimeout = setTimeout(() => {
            const s = layer.__origStyle || { color: "rgba(148, 163, 184, 1)", weight: 0.6, fillColor: "#006A2E", fillOpacity: 1 };
            layer.setStyle({
              color: s.color,
              weight: s.weight,
              fillColor: s.fillColor,
              fillOpacity: s.fillOpacity
            });
            __hoverTimeout = null;
          }, 120);
          try { if (provinceMaskLayer) provinceMaskLayer.setStyle({ fillColor: '#D3ECFF' }); } catch (e) {}
        });
      }
    }).addTo(map);

    // DEFERRED: Only add mask after a delay to avoid blocking initial render
    setTimeout(() => {
      addProvinceMask(units).catch(() => {});
    }, 500);

    unitsLayer.bringToFront();
    
    // DEFERRED: Create labels after a delay
    setTimeout(() => {
      createUnitLabels(unitsLayer);
      map.on('zoomend', updateLabelsVisibility);
    }, 800);

  } catch (err) {
    console.warn("⚠️ Units load failed:", err);
  }
}

// ====== RENDER - OPTIMIZED WITH RAF ======
function render(points) {
  const MAX_MARKERS = 200;
  const displayPoints = points.slice(0, MAX_MARKERS);
  
  // Use requestAnimationFrame for smooth rendering
  requestAnimationFrame(() => {
    markersLayer.clearLayers();
    markers = [];

    displayPoints.forEach(p => {
      const iconKey = p.category || p.type || 'tour';
      const icon = customIcons[iconKey] || customIcons.tour;

      const m = L.marker([p.lat, p.lng], { icon });
      const html = buildPopupHTML(p);

      m.bindPopup(html, { 
        maxWidth: 320, 
        minWidth: 280,
        autoPan: true,
        autoPanPaddingTopLeft: [10, 60],
        autoPanPaddingBottomRight: [10, 60]
      });
      
      m.on('popupopen', () => attachPopupEvents(p));
      m._meta = { id: p.id, category: p.category };

      markersLayer.addLayer(m);
      markers.push(m);
    });
  });

  // Defer sidebar and cards rendering
  setTimeout(() => {
    renderSidebarList(points);
    renderBottomCards(displayPoints);
    updateStats(points);
  }, 50);
}

function renderSidebarList(points) {
  if (!els.spotList) return;
  
  const BATCH_SIZE = 30; // Reduced from 50
  const visible = points.slice(0, BATCH_SIZE);
  
  // Use fragment for better performance
  const fragment = document.createDocumentFragment();
  
  visible.forEach(p => {
    const div = document.createElement('div');
    div.className = 'spot-card';
    div.dataset.id = p.id;
    div.innerHTML = `
      <img src="${esc(p.thumb || 'images/placeholder.jpg')}" alt="${esc(p.name)}" loading="lazy">
      <div class="spot-info">
        <h4>${esc(p.name)}</h4>
        <div class="spot-meta" data-cat="${esc(p.category)}">
          ${catLabel(p.category)}
        </div>
        <p>${esc((p.desc || '').slice(0, 60))}${(p.desc || '').length > 60 ? '...' : ''}</p>
      </div>
    `;
    
    div.onclick = () => {
      const spot = points.find(pt => pt.id === p.id);
      if (spot) {
        // Quick zoom without heavy animation
        map.setView([spot.lat, spot.lng], Math.max(map.getZoom(), map.getMinZoom() + 2), {
          animate: true,
          duration: 0.5
        });
        
        // Open popup immediately
        const mk = markers.find(m => m._meta?.id === p.id);
        if (mk) {
          setTimeout(() => mk.openPopup(), 100);
        }
      }
      document.body.classList.add("sidebar-collapsed");
      els.sidebar?.classList.add("collapsed");
    };
    
    fragment.appendChild(div);
  });
  
  els.spotList.innerHTML = '';
  els.spotList.appendChild(fragment);
}

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
        
        // Quick setView instead of flyTo
        map.setView([spot.lat, spot.lng], Math.max(map.getZoom(), map.getMinZoom() + 2), {
          animate: true,
          duration: 0.5
        });
        
        const mk = markers.find(m => m._meta?.id === id);
        if (mk) {
          setTimeout(() => mk.openPopup(), 100);
        }
      }
      document.body.classList.add("sidebar-collapsed");
      els.sidebar?.classList.add("collapsed");
    };
  });
}

function updateStats(points) {
  const total = points.length;
  const tour = points.filter(p => (p.category || "").toLowerCase() === "tour").length;
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
  }, 300));

  els.sidebarToggle?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    els.sidebar?.classList.toggle("collapsed");
  });

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
        ${typeIconHTML(p)} <span>${esc(p.name)}</span>
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

function typeIconHTML(p) {
  const cat = ((p && p.category) || (typeof p === 'string' && p) || '').toLowerCase();
  const typ = ((p && p.type) || '').toLowerCase();
  let key = 'tour';
  if (cat === 'event' || typ === 'event') key = 'event';
  else if (typ === 'eat' || cat === 'service' || typ === 'eat1') key = 'eat';
  else key = 'tour';

  const iconMap = {
    eat: 'images/icons/eat.png',
    event: 'images/icons/event.png',
    tour: 'images/icons/tour.png'
  };

  const src = iconMap[key] || iconMap.tour;
  return `<img src="${src}" alt="${esc(key)}" style="width:22px;height:22px;margin-right:8px;vertical-align:middle;display:inline-block">`;
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
      namegit : 'Vịnh Hạ Long',
      category: 'tour',
      type: 'play',
      lat: 20.9101,
      lng: 107.1839,
      desc: 'Di sản thiên nhiên thế giới',
      thumb: 'https://picsum.photos/400/300?random=1'
    }
  ];
}