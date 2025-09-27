 
 
 
const STORAGE_KEYS = {
  THEME: "wa_theme",
  HISTORY: "wa_history",
  API_KEY: "wa_api_key",
  LAST_COORDS: "wa_last_coords"
};

 
const DEFAULT_API_KEY = "92b23012ad5c06f1986806eb7dd045db"; // can be replaced in UI
const DEFAULT_CITY = "Hanoi"; // Default city when location is unavailable
const OW_BASE = "https://api.openweathermap.org";
 
const GEOCODING_URL = (q, limit = 1, apiKey) =>
  `${OW_BASE}/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=${limit}&appid=${apiKey}`;
 
const CURRENT_URL = (lat, lon, apiKey) =>
  `${OW_BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=en&appid=${apiKey}`;
 
const FORECAST_URL = (lat, lon, apiKey) =>
  `${OW_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=en&appid=${apiKey}`;

 
const OM_GEOCODE = (q, count = 1) => `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${count}&language=en&format=json`;
const OM_FORECAST = (lat, lon) => {
  const daily = [
    "weathercode",
    "temperature_2m_max",
    "temperature_2m_min",
  ].join(",");
  const hourly = [
    "uv_index"
  ].join(",");
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=${daily}&hourly=${hourly}&timezone=auto&forecast_days=5`;
};

// Helper: compute nearest-hour UV and update UI
function setUVFromOMData(data) {
  try {
    if (!el.curUV) return;
    const uvArr = data?.hourly?.uv_index || [];
    const timeArr = data?.hourly?.time || [];
    let uvNum = 0;
    if (uvArr.length && timeArr.length) {
      const nowIso = new Date().toISOString().slice(0,13);
      let idx = timeArr.findIndex(t => t.startsWith(nowIso));
      if (idx < 0) idx = 0;
      const v = uvArr[idx];
      uvNum = typeof v === 'number' && isFinite(v) ? v : 0;
    }
    el.curUV.textContent = uvNum.toFixed(1);
  } catch {}
}

async function fetchUVIndexOM(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=uv_index&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('UV fetch failed');
  return await res.json();
}

 
const NOMINATIM_REVERSE = (lat, lon) => `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&accept-language=en`;
const NOMINATIM_SEARCH = (q, limit = 1) => `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&accept-language=en&addressdetails=1&limit=${limit}`;
 

 
const el = {
  body: document.body,
  alert: document.getElementById("alert"),
  form: document.getElementById("search-form"),
  input: document.getElementById("city-input"),
  suggestions: null,
  fxLayer: document.getElementById("fx-layer"),
  btnLocation: document.getElementById("btn-location"),
  themeToggle: null,
  apikeyToggle: null,
  apikeyPanel: null,
  apikeyInput: null,
  apikeySave: null,
  apikeyClear: null,
  
  curIcon: document.getElementById("current-icon"),
  curTemp: document.getElementById("current-temp"),
  curCity: document.getElementById("current-city"),
  curDesc: document.getElementById("current-desc"),
  curHumidity: document.getElementById("current-humidity"),
  curWind: document.getElementById("current-wind"),
  curUpdated: document.getElementById("current-updated"),
  curFeels: document.getElementById("current-feels"),
  curSunrise: document.getElementById("current-sunrise"),
  curSunset: document.getElementById("current-sunset"),
  curUV: document.getElementById("current-uv"),
  dailyTip: document.getElementById("daily-tip"),
  
  forecast: document.getElementById("forecast"),
  hourly: document.getElementById("hourly"),
  
  astroMoon: document.getElementById("astro-moon"),
  astroDaylen: document.getElementById("astro-daylen"),
  astroSuggest: document.getElementById("astro-suggest"),
  
  historyList: null,
  clearHistory: null,
};

 
function showAlert(message, type = "error") {
  el.alert.textContent = message;
  el.alert.hidden = false;
  el.alert.style.background = type === "error" ? "#ef44441a" : "#22c55e1a";
}
function clearAlert() {
  el.alert.hidden = true;
  el.alert.textContent = "";
}

function formatTemp(c) { return `${Math.round(c)}°C`; }
function formatWind(ms) { return `${ms.toFixed(1)} m/s`; }
function formatDate(ts) {
  const d = new Date(ts);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}
function formatDay(ts) {
  const d = new Date(ts);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "2-digit", month: "2-digit" }).format(d);
}

 
function mapWeatherToIconAndBg(main, desc) {
  const m = (main || "").toLowerCase();
  const d = (desc || "").toLowerCase();
  if (m.includes("thunder")) return { icon: "⛈️", bg: "bg-rain" };
  if (m.includes("drizzle")) return { icon: "🌧️", bg: "bg-rain" };
  if (m.includes("rain")) return { icon: "🌧️", bg: "bg-rain" };
  if (m.includes("snow")) return { icon: "❄️", bg: "bg-snow" };
  if (m.includes("clear")) return { icon: "☀️", bg: "bg-sunny" };
  if (m.includes("cloud")) return { icon: "☁️", bg: "bg-clouds" };
  // mists, smoke, haze, dust, fog, sand, ash, squall, tornado
  if (m.includes("mist") || m.includes("fog") || m.includes("haze")) return { icon: "🌫️", bg: "bg-clouds" };
  return { icon: "⛅", bg: "bg-default" };
}

 
function countryCodeToName(code) {
  if (!code) return "";
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    const name = dn.of(String(code).toUpperCase());
    if (name && name !== code) return name;
  } catch {}
  const fallback = {
    VN: "Vietnam", JP: "Japan", US: "United States", GB: "United Kingdom", FR: "France",
    DE: "Germany", KR: "South Korea", CN: "China", TH: "Thailand", SG: "Singapore",
    MY: "Malaysia", ID: "Indonesia", AU: "Australia", CA: "Canada", RU: "Russia",
    IT: "Italy", ES: "Spain"
  };
  return fallback[String(code).toUpperCase()] || String(code).toUpperCase();
}

 
function normalizeAdminName(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s
    .replace(/\bProvince\b/gi, "")
    .replace(/\bCity\b/gi, "")
    .replace(/\bMunicipality\b/gi, "")
    .replace(/\bDistrict\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatLocationLabel(city, state, countryOrCode) {
  const country = countryCodeToName(countryOrCode || "");
  const parts = [normalizeAdminName(city), normalizeAdminName(state), country]
    .filter(Boolean)
    .filter((p, i, arr) => arr.indexOf(p) === i);
  return parts.join(", ");
}

function buildLabelFromNominatim(address = {}) {
  const country = address.country || countryCodeToName(address.country_code);
  const ward = address.suburb || address.neighbourhood || address.quarter || address.ward || address.village || address.town || address.municipality || address.city_district || "";
  const city = address.city || address.town || address.municipality || address.county || "";
  const province = address.state || address.province || address.region || address.state_district || "";
  const parts = [normalizeAdminName(ward), normalizeAdminName(city), normalizeAdminName(province), country]
    .filter(Boolean)
    .filter((p, i, arr) => arr.indexOf(p) === i);
  return parts.join(", ");
}

 
function mapOMCode(code) {
  const c = Number(code);
  // Source: https://open-meteo.com/en/docs#api_form
  if ([0].includes(c)) return { icon: "☀️", bg: "bg-sunny", desc: "Clear" };
  if ([1,2,3].includes(c)) return { icon: "⛅", bg: "bg-clouds", desc: "Partly cloudy / Cloudy" };
  if ([45,48].includes(c)) return { icon: "🌫️", bg: "bg-clouds", desc: "Fog" };
  if ([51,53,55,56,57].includes(c)) return { icon: "🌦️", bg: "bg-rain", desc: "Drizzle" };
  if ([61,63,65,66,67,80,81,82].includes(c)) return { icon: "🌧️", bg: "bg-rain", desc: "Rain" };
  if ([71,73,75,77,85,86].includes(c)) return { icon: "❄️", bg: "bg-snow", desc: "Snow" };
  if ([95,96,99].includes(c)) return { icon: "⛈️", bg: "bg-rain", desc: "Thunderstorm" };
  return { icon: "⛅", bg: "bg-default", desc: "" };
}

 
function getSavedTheme() { return "light"; }
function applyTheme(theme) {
  el.body.classList.remove("theme-dark");
  el.body.classList.add("theme-light");
  try { localStorage.setItem(STORAGE_KEYS.THEME, "light"); } catch {}
}

 
function getApiKey() {
  // Prefer key in LocalStorage; fallback to provided default key
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || DEFAULT_API_KEY || "";
}
function ensureApiKeyOrExplain(silent = false) {
  const key = getApiKey();
  return key;
}

 
function getHistory() { return []; }

 
function setLastCoords(lat, lon) {
  try {
    const payload = { lat, lon, t: Date.now() };
    localStorage.setItem(STORAGE_KEYS.LAST_COORDS, JSON.stringify(payload));
  } catch {}
}
function getLastCoords(maxAgeMs = 30 * 60 * 1000) { // 30 minutes
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_COORDS) || "null");
    if (v && v.t && (Date.now() - v.t) <= maxAgeMs && typeof v.lat === "number" && typeof v.lon === "number") {
      return { lat: v.lat, lon: v.lon };
    }
  } catch {}
  return null;
}
function setHistory(arr) { /* history disabled */ }
function addToHistory(city) {
  const trimmed = city.trim();
  if (!trimmed) return;
  const h = getHistory();
  // avoid duplicates, move to top
  const next = [trimmed, ...h.filter(c => c.toLowerCase() !== trimmed.toLowerCase())];
  setHistory(next);
  renderHistory();
}
function renderHistory() { /* history disabled */ }

 
async function geocodeCity(city, apiKey) {
  const url = GEOCODING_URL(city, 1, apiKey);
  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = j?.message ? `: ${j.message}` : ""; } catch {}
    throw new Error(`Geocoding failed (HTTP ${res.status})${detail}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("City not found");
  const { name, lat, lon, country, state } = data[0];
  return { name, lat, lon, country, state };
}

async function fetchCurrent(lat, lon, apiKey) {
  const res = await fetch(CURRENT_URL(lat, lon, apiKey));
  if (!res.ok) throw new Error("Failed to fetch current weather");
  return await res.json();
}

async function fetchForecast(lat, lon, apiKey) {
  const res = await fetch(FORECAST_URL(lat, lon, apiKey));
  if (!res.ok) throw new Error("Failed to fetch forecast");
  return await res.json();
}

 
async function fetchCurrentByCity(city, apiKey) {
  const url = `${OW_BASE}/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=en&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = j?.message ? `: ${j.message}` : ""; } catch {}
    throw new Error(`Failed to fetch weather by city (HTTP ${res.status})${detail}`);
  }
  return await res.json();
}

 
async function omGeocodeCity(city) {
  const res = await fetch(OM_GEOCODE(city, 1));
  if (!res.ok) throw new Error("Open-Meteo geocoding failed");
  const data = await res.json();
  const f = data?.results?.[0];
  if (!f) throw new Error("City not found (OM)");
  return {
    name: f.name,
    lat: f.latitude,
    lon: f.longitude,
    country: f.country_code,
    state: f.admin1,
  };
}

async function omFetch(lat, lon) {
  const res = await fetch(OM_FORECAST(lat, lon));
  if (!res.ok) throw new Error("Failed to fetch Open-Meteo data");
  const j = await res.json();
  return j;
}

async function reverseGeocode(lat, lon) {
  const url = NOMINATIM_REVERSE(lat, lon);
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const j = await res.json();
  const a = j.address || {};
  // Preferred display: "City, State/Province, Country"
  // Get candidate city from multiple levels (city/town prioritized)
  const rawCity = a.city || a.town || a.municipality || a.village || a.city_district || a.county || "";
  const wardLike = /^(phường|xã|thị trấn|thi\s*tran|phuong|xa|ward|commune)/i.test(rawCity);
  // Nếu city có vẻ là phường/xã, thay bằng city/town thực hoặc county/tỉnh
  const city = wardLike ? (a.city || a.town || a.county || "") : rawCity;
  const province = a.state || a.province || a.region || a.state_district || a.county || "";
  const countryCode = (a.country_code || "").toUpperCase();
  const countryName = a.country || countryCodeToName(countryCode) || countryCode;

  // Fallback: if no city, use province or county
  const locality = (city && city.trim()) ? city : (province || a.county || a.country || "");

  const parts = [locality, province, countryName]
    .map(s => (s || "").trim())
    .filter(Boolean)
    .filter((p, i, arr) => arr.indexOf(p) === i); // loại trùng
  return parts.join(", ");
}

async function nominatimSearch(q) {
  const res = await fetch(NOMINATIM_SEARCH(q, 1), { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error("Nominatim search failed");
  const arr = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("Place not found");
  const item = arr[0];
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  const label = buildLabelFromNominatim(item.address || {});
  return { lat, lon, label };
}

 
function summarizeForecast(list) {
  const byDay = new Map();
  list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!byDay.has(date)) byDay.set(date, []);
    byDay.get(date).push(item);
  });
  const days = Array.from(byDay.entries())
    .slice(0, 6) // may include today; trimmed to 5 days
    .map(([date, items]) => {
      // tìm mốc gần 12:00
      let pick = items.reduce((best, cur) => {
        const diffBest = Math.abs(new Date(best.dt_txt).getHours() - 12);
        const diffCur = Math.abs(new Date(cur.dt_txt).getHours() - 12);
        return diffCur < diffBest ? cur : best;
      }, items[0]);
      const temps = items.map(i => i.main.temp);
      const tempMin = Math.min(...temps);
      const tempMax = Math.max(...temps);
      return { date, pick, tempMin, tempMax };
    });
  // nếu phần tử đầu là hôm nay và đã có current card, vẫn hiển thị 5 mục từ hôm nay
  return days.slice(0, 5);
}

 
function renderCurrent(cityLabel, data) {
  const main = data.weather?.[0]?.main || "";
  const desc = data.weather?.[0]?.description || "";
  const { bg } = mapWeatherToIconAndBg(main, desc);
  el.curTemp.textContent = formatTemp(data.main.temp);
  el.curCity.textContent = cityLabel;
  el.curDesc.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);
  el.curHumidity.textContent = String(data.main.humidity ?? "-");
  el.curWind.textContent = formatWind(data.wind?.speed || 0);
  el.curUpdated.textContent = `Updated: ${formatDate(Date.now())}`;
  if (el.curFeels) el.curFeels.textContent = formatTemp(data.main.feels_like ?? data.main.temp);
  if (el.curSunrise) try { el.curSunrise.textContent = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date((data.sys?.sunrise ?? 0) * 1000)); } catch {}
  if (el.curSunset) try { el.curSunset.textContent = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date((data.sys?.sunset ?? 0) * 1000)); } catch {}

  
  try {
    if (el.astroMoon) {
      const phase = computeMoonPhase(new Date());
      el.astroMoon.textContent = phase.label + ' ' + phase.icon;
    }
    if (el.astroDaylen) {
      const sr = new Date((data.sys?.sunrise ?? 0) * 1000);
      const ss = new Date((data.sys?.sunset ?? 0) * 1000);
      if (!isNaN(sr) && !isNaN(ss) && ss > sr) {
        const diffMs = ss - sr;
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.round((diffMs % 3600000) / 60000);
        const nightHrs = 24 - hrs - Math.floor((mins)/60);
        const nightMins = (60 - (mins % 60)) % 60;
        el.astroDaylen.textContent = `Daytime ${hrs}h ${mins}m, nighttime ${nightHrs}h ${nightMins}m`;
      }
    }
    if (el.astroSuggest) {
      const mainLower = (data.weather?.[0]?.main || '').toLowerCase();
      let s = '—';
      if (mainLower.includes('clear')) s = 'Great weather for a run 🏃‍♂️';
      else if (mainLower.includes('rain') || mainLower.includes('drizzle')) s = 'Perfect for a cozy movie at home 🎬';
      else if ((data.wind?.speed || 0) >= 8) s = 'Be cautious when riding a bike';
      else s = 'Nice weather for a walk';
      el.astroSuggest.textContent = s;
    }
    if (el.dailyTip) {
      const temp = data.main?.temp ?? 0;
      const m = (data.weather?.[0]?.main || '').toLowerCase();
      let tip = '—';
      if (m.includes('rain') || m.includes('drizzle')) tip = 'Don\'t forget an umbrella!';
      else if (temp <= 16) tip = 'Wear something warm and sip hot tea.';
      else if (temp >= 34) tip = 'Stay hydrated and avoid midday sun.';
      else if (m.includes('clear')) tip = 'Wear sunglasses and sunscreen.';
      else tip = 'Have a great day!';
      el.dailyTip.textContent = tip;
    }
  } catch {}

  
  el.body.classList.remove("bg-sunny", "bg-rain", "bg-clouds", "bg-snow", "bg-default");
  el.body.classList.add(bg);
  renderEffectsByCondition(main.toLowerCase());
}

function renderForecast(list) {
  const days = summarizeForecast(list);
  el.forecast.innerHTML = "";
  days.forEach(d => {
    const main = d.pick.weather?.[0]?.main || "";
    const desc = d.pick.weather?.[0]?.description || "";
    const { icon } = mapWeatherToIconAndBg(main, desc);
    const div = document.createElement("div");
    div.className = "forecast-item";
    div.innerHTML = `
      <div class="day">${formatDay(new Date(d.date))}</div>
      <div class="fi-icon">${icon}</div>
      <div class="fi-desc">${desc}</div>
      <div class="fi-temp">${Math.round(d.tempMin)}°C - ${Math.round(d.tempMax)}°C</div>
    `;
    el.forecast.appendChild(div);
  });
}

function renderHourly(list) {
  if (!el.hourly) return;
  el.hourly.innerHTML = "";
  
  const max = Math.min(list.length, 4);
  for (let i = 0; i < max; i++) {
    const it = list[i];
    const main = it.weather?.[0]?.main || "";
    const desc = it.weather?.[0]?.description || "";
    const { icon } = mapWeatherToIconAndBg(main, desc);
    const div = document.createElement("div");
    div.className = "hourly-item";
    const t = new Date(it.dt * 1000);
  const time = new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(t);
    div.innerHTML = `
      <div class="h-time">${time}</div>
      <div class="h-icon">${icon}</div>
      <div class="h-desc">${desc}</div>
      <div class="h-temp">${Math.round(it.main?.temp ?? 0)}°C</div>
    `;
    el.hourly.appendChild(div);
  }
}

function renderCurrentOM(cityLabel, data) {
  
  const cw = data.current_weather || {};
  const m = mapOMCode(cw.weathercode);
  el.curTemp.textContent = formatTemp(cw.temperature ?? 0);
  el.curCity.textContent = cityLabel;
  el.curDesc.textContent = m.desc || "—";
  el.curHumidity.textContent = "-"; // OM gói đơn giản không có độ ẩm hiện tại
  el.curWind.textContent = `${(cw.windspeed ?? 0).toFixed(1)} m/s`;
  el.curUpdated.textContent = `Updated: ${formatDate(new Date(cw.time))}`;
  if (el.curFeels) el.curFeels.textContent = formatTemp(cw.temperature ?? 0);
  if (el.curSunrise) el.curSunrise.textContent = "--:--";
  if (el.curSunset) el.curSunset.textContent = "--:--";

  
  try {
    // UV index from Open-Meteo hourly if available; default to 0 when absent
    if (el.curUV) {
      const uvArr = data.hourly?.uv_index || [];
      const timeArr = data.hourly?.time || [];
      let uvNum = 0;
      if (uvArr.length && timeArr.length) {
        const nowIso = new Date().toISOString().slice(0,13);
        let idx = timeArr.findIndex(t => t.startsWith(nowIso));
        if (idx < 0) idx = 0;
        const v = uvArr[idx];
        uvNum = typeof v === 'number' && isFinite(v) ? v : 0;
      }
      el.curUV.textContent = uvNum.toFixed(1);
    }
    if (el.astroMoon) {
      const phase = computeMoonPhase(new Date());
      el.astroMoon.textContent = phase.label + ' ' + phase.icon;
    }
    if (el.astroDaylen) el.astroDaylen.textContent = '—';
    if (el.astroSuggest) {
      const k = (m.desc || '').toLowerCase();
      let s = '—';
      if (k.includes('clear')) s = 'Great weather for a run 🏃‍♂️';
      else if (k.includes('rain') || k.includes('drizzle')) s = 'Perfect for a cozy movie at home 🎬';
      else s = 'Nice weather for a walk 🚶‍♂️';
      el.astroSuggest.textContent = s;
    }
  } catch {}

  el.body.classList.remove("bg-sunny", "bg-rain", "bg-clouds", "bg-snow", "bg-default");
  el.body.classList.add(m.bg);
  
  const kind = m.desc.toLowerCase().includes("snow") ? "snow" : m.desc.toLowerCase().includes("rain") ? "rain" : m.desc.toLowerCase().includes("clear") ? "sunny" : "clouds";
  renderEffectsByCondition(kind);
}

function renderForecastOM(data) {
  
  const d = data.daily || {};
  const len = Math.min(5, (d.time || []).length);
  el.forecast.innerHTML = "";
  for (let i = 0; i < len; i++) {
    const dateStr = d.time[i];
    const code = d.weathercode?.[i];
    const tmax = d.temperature_2m_max?.[i];
    const tmin = d.temperature_2m_min?.[i];
    const m = mapOMCode(code);
    const div = document.createElement("div");
    div.className = "forecast-item";
    div.innerHTML = `
      <div class="day">${formatDay(new Date(dateStr))}</div>
      <div class="fi-icon">${m.icon}</div>
      <div class="fi-desc">${m.desc}</div>
      <div class="fi-temp">${Math.round(tmin)}°C - ${Math.round(tmax)}°C</div>
    `;
    el.forecast.appendChild(div);
  }
}

 
async function updateWeatherByCoords(lat, lon, label, { silent = false } = {}) {
  clearAlert();
  const apiKey = ensureApiKeyOrExplain(silent);
  try { setLastCoords(lat, lon); } catch {}
  if (!apiKey) {
    if (silent) {
      try {
        const om = await omFetch(lat, lon);
        renderCurrentOM(label, om);
        renderForecastOM(om);
        return;
      } catch (eom) {
        if (!silent) showAlert(eom.message || "Không lấy được dữ liệu (OM)");
        return;
      }
    }
    return; // non-silent flow already showed guidance
  }
  try {
    const [cur, fc, uv] = await Promise.all([
      fetchCurrent(lat, lon, apiKey),
      fetchForecast(lat, lon, apiKey),
      fetchUVIndexOM(lat, lon).catch(() => null),
    ]);
    renderCurrent(label, cur);
    renderForecast(fc.list || []);
    renderHourly(fc.list || []);
    if (uv) setUVFromOMData(uv);
  } catch (err) {
    
    try {
      const om = await omFetch(lat, lon);
      renderCurrentOM(label, om);
      renderForecastOM(om);
      setUVFromOMData(om);
    } catch (eom) {
      showAlert(err.message || eom.message || "Có lỗi xảy ra khi tải dữ liệu");
    }
  }
}

async function searchByCity(city, { silent = false } = {}) {
  const apiKey = ensureApiKeyOrExplain(silent);
  const q = city?.trim() || el.input.value.trim();
  if (!q) return showAlert("Please enter a city name");
  clearAlert();
  try {
    const found = await nominatimSearch(q);
    if (apiKey) {
      await updateWeatherByCoords(found.lat, found.lon, found.label, { silent });
    } else {
      try {
        const om = await omFetch(found.lat, found.lon);
        renderCurrentOM(found.label, om);
        renderForecastOM(om);
      } catch (eom) {
        if (!silent) showAlert(eom.message || "Failed to fetch data (OM)");
        return;
      }
    }
    addToHistory(found.label);
    clearAlert();
    return;
  } catch {}

  if (!apiKey) {
    if (silent) {
      try {
        const loc2 = await omGeocodeCity(q);
        const label2 = formatLocationLabel(loc2.name, loc2.state, loc2.country);
        const om = await omFetch(loc2.lat, loc2.lon);
        renderCurrentOM(label2, om);
        renderForecastOM(om);
        addToHistory(label2);
        clearAlert();
        return;
      } catch (eom) {
        if (!silent) showAlert(eom.message || "City not found");
        return;
      }
    }
    return;
  }
  try {
    const loc = await geocodeCity(q, apiKey);
    const label = formatLocationLabel(loc.name, loc.state, loc.country);
    await updateWeatherByCoords(loc.lat, loc.lon, label, { silent });
    addToHistory(label);
  } catch (err) {
    // Fallback: thử gọi trực tiếp weather?q=...
    console.error("Geocoding error:", err);
    try {
      const current = await fetchCurrentByCity(q, apiKey);
      const label = formatLocationLabel(current.name, null, current.sys?.country);
      renderCurrent(label, current);
      try {
        const fc = await fetchForecast(current.coord.lat, current.coord.lon, apiKey);
        renderForecast(fc.list || []);
      } catch (e2) {
        console.error("Forecast error:", e2);
      }
      addToHistory(label);
      clearAlert();
    } catch (e) {
      try {
        const loc2 = await omGeocodeCity(q);
        const label2 = formatLocationLabel(loc2.name, loc2.state, loc2.country);
        const om = await omFetch(loc2.lat, loc2.lon);
        renderCurrentOM(label2, om);
        renderForecastOM(om);
        addToHistory(label2);
        clearAlert();
      } catch (eom) {
        showAlert(e.message || err.message || eom.message || "City not found");
      }
    }
  }
}

function useGeolocation({ silent = false, onFail } = {}) {
  clearAlert();
  if (!navigator.geolocation) {
    if (!silent) showAlert("Geolocation is not supported by this browser");
    if (onFail) onFail();
    return;
  }
  const apiKey = ensureApiKeyOrExplain(silent);
  if (!apiKey) return;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    let label = "Current location";
    try { label = await reverseGeocode(latitude, longitude) || label; } catch {}
    await updateWeatherByCoords(latitude, longitude, label, { silent });
    try {
      const watchId = navigator.geolocation.watchPosition(async (p) => {
        const { latitude: la, longitude: lo, accuracy } = p.coords;
        if (typeof accuracy !== 'number' || accuracy === 0 || accuracy > 5000) return;
        let lb = label;
        try { lb = await reverseGeocode(la, lo) || lb; } catch {}
        await updateWeatherByCoords(la, lo, lb, { silent: true });
        navigator.geolocation.clearWatch(watchId);
      }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    } catch {}
  }, (err) => {
    if (!silent) showAlert("Unable to get location: " + (err.message || ""));
    if (onFail) onFail();
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
}

window.addEventListener("DOMContentLoaded", () => {
  
  applyTheme(getSavedTheme());
  

  

  
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    searchByCity();
  });
  el.btnLocation.addEventListener("click", useGeolocation);

  
  try { localStorage.removeItem(STORAGE_KEYS.HISTORY); } catch {}


  try {
    const cached = getLastCoords();
    if (cached) {
      (async () => {
        let label = "Recent location";
        try { label = await reverseGeocode(cached.lat, cached.lon) || label; } catch {}
        await updateWeatherByCoords(cached.lat, cached.lon, label, { silent: true });
      })();
    }
    useGeolocation({ silent: true, onFail: () => {
      if (!cached) searchByCity(DEFAULT_CITY, { silent: true });
    }});
  } catch {
    searchByCity(DEFAULT_CITY, { silent: true });
  }
});

function clearFx() {
  if (!el.fxLayer) return;
  el.fxLayer.innerHTML = "";
}

function rand(min, max) { return Math.random() * (max - min) + min; }

function addRain(count = 160) {
  for (let i = 0; i < count; i++) {
    const drop = document.createElement("div");
    drop.className = "fx raindrop";
    drop.style.left = rand(0, 100) + "vw";
    drop.style.top = rand(-12, -1) + "vh";
    drop.style.setProperty('--dur', rand(1.2, 2.2) + 's');
    drop.style.setProperty('--w', rand(1.5, 2.2) + 'px');
    drop.style.setProperty('--h', rand(10, 16) + 'px');
    drop.style.setProperty('--o', rand(0.5, 0.95));
    drop.style.setProperty('--drift', rand(-18, -6) + 'px');
    drop.style.animationDelay = rand(0, 2) + "s";
    el.fxLayer.appendChild(drop);
  }
  // sporadic splashes
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("div");
    s.className = "fx splash";
    s.style.left = rand(0, 100) + "vw";
    s.style.setProperty('--sx', rand(-6, 6) + 'px');
    s.style.setProperty('--sw', rand(8, 16) + 'px');
    s.style.setProperty('--sh', rand(2, 4) + 'px');
    s.style.animationDelay = rand(0, 2) + 's';
    el.fxLayer.appendChild(s);
  }
}

function addSnow(count = 80) {
  for (let i = 0; i < count; i++) {
    const flake = document.createElement("div");
    flake.className = "fx snowflake";
    flake.style.left = rand(0, 100) + "vw";
    flake.style.top = rand(-10, 0) + "vh";
    const dur = rand(4, 8);
    flake.style.animationDuration = dur + "s";
    flake.style.animationDelay = rand(0, 3) + "s";
    el.fxLayer.appendChild(flake);
  }
}

function addClouds(count = 6) {
  for (let i = 0; i < count; i++) {
    const cloud = document.createElement("div");
    // chọn lớp để tạo chiều sâu: back/mid/front
    const layers = ["layer-back", "layer-mid", "layer-front"];
    const layer = layers[Math.floor(rand(0, layers.length))];
    cloud.className = `fx cloud ${layer}`;
    cloud.style.top = rand(8, 60) + "vh";
    cloud.style.left = rand(-20, 80) + "vw";
    cloud.style.setProperty('--cdur', rand(35, 70) + 's');
    cloud.style.setProperty('--cw', rand(200, 360) + 'px');
    cloud.style.setProperty('--ch', rand(120, 200) + 'px');
    cloud.style.setProperty('--cblur', rand(0.5, 2.5));
    cloud.style.opacity = String(rand(0.6, 0.95));
    el.fxLayer.appendChild(cloud);
  }
}

function addSunrays() {
  const sun = document.createElement("div");
  sun.className = "fx sunrays";
  sun.style.top = "10vh";
  sun.style.right = "10vw";
  el.fxLayer.appendChild(sun);
}

function renderEffectsByCondition(kind) {
  clearFx();
  const k = (kind || "").toLowerCase();
  if (k.includes("rain")) { addRain(); addClouds(3); return; }
  if (k.includes("snow")) { addSnow(); addClouds(3); return; }
  if (k.includes("clear") || k.includes("sunny") ) { addSunrays(); addClouds(2); return; }
  if (k.includes("cloud")) { addClouds(6); return; }
  // default subtle
  addClouds(3);
}

function normalizeStr(s) {
  const input = (s || "").toLowerCase();
  let out = input;
  try {
    out = input
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '');
  } catch {
    out = input
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd');
  }
  return out.replace(/\s+/g,' ').trim();
}

async function fetchWithTimeout(url, { headers, signal } = {}, timeoutMs = 1200) {
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: ac.signal });
  } finally {
    clearTimeout(t);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

function computeMoonPhase(date) {
  const lp = 2551443;
  const now = date.getTime() / 1000;
  const newMoon = Date.UTC(2001,0,24,13,0,0) / 1000;
  const phase = ((now - newMoon) % lp) / lp; // 0..1
  if (phase < 0.03 || phase > 0.97) return { label: 'New Moon', icon: '🌑' };
  if (phase < 0.22) return { label: 'Waxing Crescent', icon: '🌙' };
  if (phase < 0.28) return { label: 'First Quarter', icon: '🌓' };
  if (phase < 0.47) return { label: 'Waxing Gibbous', icon: '🌔' };
  if (phase < 0.53) return { label: 'Full Moon', icon: '🌕' };
  if (phase < 0.72) return { label: 'Waning Gibbous', icon: '🌖' };
  if (phase < 0.78) return { label: 'Last Quarter', icon: '🌗' };
  return { label: 'Waning Crescent', icon: '🌘' };
}

function updateFxTopOffset() {
  const header = document.querySelector('.app-header');
  const rect = header ? header.getBoundingClientRect() : null;
  const top = rect ? Math.max(0, Math.round(rect.bottom)) : (header ? header.offsetHeight : 0);
  document.documentElement.style.setProperty('--fx-top', top + 'px');
}

window.addEventListener('load', updateFxTopOffset);
window.addEventListener('resize', updateFxTopOffset);
window.addEventListener('scroll', updateFxTopOffset, { passive: true });


