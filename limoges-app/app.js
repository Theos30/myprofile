// Limoges — app : Ma page (widgets personnalisables), carte, agenda, quiz, guide

const $ = (sel, root = document) => root.querySelector(sel);
const view = $("#view");
const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
const ic = (name, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

// ---------- Stockage local (préférences de l'appareil) ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("lim:" + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("lim:" + key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  },
};

// ---------- Dates ----------
const fmtDay = (d) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = (d) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtDM = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtTime = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const monthShort = (d) => d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
const hasTime = (d) => d.getHours() !== 0 || d.getMinutes() !== 0;
const dayIndex = () => { const n = new Date(); return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5); };

const stars = (n) => {
  const r = Math.round(n);
  return `<span class="stars" aria-label="${n} sur 5">${[1, 2, 3, 4, 5].map((k) => ic("star", k <= r ? "" : "off")).join("")}</span>`;
};
const catGradient = (cat) => ({
  patrimoine: "var(--ocean)", culture: "linear-gradient(145deg, var(--blue), var(--sky))",
  resto: "var(--flame)", nature: "var(--forest)",
  sport: "linear-gradient(145deg, var(--red), var(--orange))",
  shopping: "linear-gradient(145deg, var(--orange), var(--yellow-deep))",
}[cat]);

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---------- Ambiance (Bleu / Nuit) ----------
(function initTheme() {
  const root = document.documentElement;
  const saved = store.get("theme", null);
  if (saved) root.dataset.theme = saved;
  else if (!root.dataset.theme) root.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  $("#theme-toggle").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    store.set("theme", next);
    if (map) setTiles();
  });
})();

// =========================================================
// Sources en direct (avec repli sur des exemples)
// =========================================================
async function getJSON(url, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// Une source est chargée une fois puis gardée 10 minutes.
// Résultat : { live: true, data } ou, en cas d'échec, { live: false, data: exemple }.
const sources = {};
function source(key, loader, sample) {
  const c = sources[key];
  if (c && Date.now() - c.at < 10 * 60e3) return c.promise;
  const promise = loader()
    .then((data) => ({ live: true, data }))
    .catch((err) => {
      console.info(`[${key}] source indisponible, exemples affichés :`, err.message);
      return { live: false, data: sample() };
    });
  sources[key] = { at: Date.now(), promise };
  return promise;
}

// --- Météo : Open-Meteo (gratuit, sans clé) ---
const WX = [
  [0, "sun", "Ensoleillé"], [1, "cloud-sun", "Plutôt ensoleillé"], [2, "cloud-sun", "Éclaircies"], [3, "cloud", "Couvert"],
  [48, "cloud", "Brouillard"], [57, "rain", "Bruine"], [67, "rain", "Pluie"], [77, "snow", "Neige"],
  [82, "rain", "Averses"], [86, "snow", "Averses de neige"], [99, "storm", "Orages"],
];
const wxInfo = (code) => { const e = WX.find(([max]) => code <= max) || WX[WX.length - 1]; return { icon: e[1], label: e[2] }; };

const loadWeather = () => source("meteo", async () => {
  const j = await getJSON("https://api.open-meteo.com/v1/forecast?latitude=45.8336&longitude=1.2611"
    + "&current=temperature_2m,weather_code,wind_speed_10m"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis&forecast_days=3");
  return {
    temp: Math.round(j.current.temperature_2m), code: j.current.weather_code, wind: Math.round(j.current.wind_speed_10m),
    days: j.daily.time.map((date, i) => ({
      date, code: j.daily.weather_code[i],
      min: Math.round(j.daily.temperature_2m_min[i]), max: Math.round(j.daily.temperature_2m_max[i]),
    })),
  };
}, () => WEATHER_SAMPLE);

// --- Sport : TheSportsDB (clé publique gratuite) ---
const SPORTSDB = "https://www.thesportsdb.com/api/v1/json/123";
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const getTeams = () => {
  const ids = store.get("teams", ["csp", "hand"]).filter((id) => TEAMS.some((t) => t.id === id));
  return ids.length ? ids : ["csp"];
};
const sampleTeam = (id) => {
  const t = TEAMS.find((x) => x.id === id), s = SPORT_SAMPLE[id];
  return { ...t, league: s.league, badge: "", last: { ...s.last, home: true }, next: s.next, live: false };
};

async function fetchTeam(t) {
  const s = await getJSON(`${SPORTSDB}/searchteams.php?t=${encodeURIComponent(t.query)}`);
  const found = s.teams || [];
  const team = found.find((x) => x.strSport === t.sport) || found[0];
  if (!team) throw new Error("équipe introuvable");
  const [last, next] = await Promise.all([
    getJSON(`${SPORTSDB}/eventslast.php?id=${team.idTeam}`).catch(() => ({})),
    getJSON(`${SPORTSDB}/eventsnext.php?id=${team.idTeam}`).catch(() => ({})),
  ]);
  const toMatch = (ev) => {
    if (!ev) return null;
    const home = ev.idHomeTeam === team.idTeam;
    const ts = ev.strTimestamp;
    const date = ts ? new Date(/(z|[+-]\d\d:?\d\d)$/i.test(ts) ? ts : ts + "Z")
                    : new Date(`${ev.dateEvent}T${(ev.strTime || "00:00:00").slice(0, 8)}`);
    return {
      opp: home ? ev.strAwayTeam : ev.strHomeTeam, home, date: date.toISOString(),
      my: num(home ? ev.intHomeScore : ev.intAwayScore), their: num(home ? ev.intAwayScore : ev.intHomeScore),
    };
  };
  const lastEv = (last.results || []).slice().sort((a, b) => (b.dateEvent || "").localeCompare(a.dateEvent || ""))[0];
  return {
    ...t, name: team.strTeam || t.name,
    league: [t.label, team.strLeague].filter(Boolean).join(" · "),
    badge: safeUrl(team.strBadge || team.strTeamBadge),
    last: toMatch(lastEv), next: toMatch((next.events || [])[0]), live: true,
  };
}

function loadSport(ids = getTeams()) {
  return source("sport:" + ids.join(","), async () => {
    const teams = await Promise.all(ids.map((id) => fetchTeam(TEAMS.find((t) => t.id === id)).catch(() => sampleTeam(id))));
    if (!teams.some((t) => t.live)) throw new Error("aucune équipe trouvée");
    return teams;
  }, () => ids.map(sampleTeam));
}

// --- Événements et culture : OpenAgenda (jeu de données public sur OpenDataSoft) ---
const ODS = "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-openagenda/records";
const SPORT_RX = /\bmatch|sport|\bcourse|\brun\b|trail|marathon|basket|handball|football|rugby|tennis|v[ée]lo|randonn|natation|tournoi|yoga/i;
const CULTURE_RX = /expo|mus[ée]e|concert|th[ée][âa]tre|spectacle|danse|cin[ée]ma|projection|film|festival|op[ée]ra|lecture|conf[ée]rence|patrimoine|visite|atelier|livre|litt[ée]ra|musique|\barts?\b|artiste|photo|jazz|chorale|orchestre|porcelaine|[ée]mail/i;
const classify = (text) => (SPORT_RX.test(text) ? "sport" : CULTURE_RX.test(text) ? "culture" : "autre");

async function fetchEvents() {
  const attempts = [`location_city="Limoges" and lastdate_end >= now()`, `location_city="Limoges"`];
  let rows = null, lastErr = null;
  for (const where of attempts) {
    try {
      const j = await getJSON(`${ODS}?${new URLSearchParams({ where, order_by: "firstdate_begin", limit: "60" })}`);
      rows = j.results || [];
      break;
    } catch (e) { lastErr = e; }
  }
  if (!rows) throw lastErr;
  const cutoff = Date.now() - 6 * 3600e3;
  const seen = new Set();
  const items = rows.map((r) => {
    const title = r.title_fr || r.title || "";
    const start = new Date(r.firstdate_begin);
    const end = new Date(r.lastdate_end || r.firstdate_end || r.firstdate_begin);
    const kw = [].concat(r.keywords_fr || []).join(" ");
    return {
      title, start, end, place: r.location_name || "Limoges",
      url: safeUrl(r.canonicalurl), kind: classify(`${title} ${kw} ${r.description_fr || ""}`),
    };
  }).filter((e) => {
    if (!e.title || isNaN(e.start) || e.end < cutoff || seen.has(e.title)) return false;
    seen.add(e.title);
    return true;
  });
  if (!items.length) throw new Error("aucun événement à venir");
  return items.sort((a, b) => whenOf(a) - whenOf(b));
}

const sampleEvents = () => EVENTS.map((e) => {
  const p = placeById[e.place], d = new Date(e.date);
  const kind = e.cat === "sport" ? "sport" : (e.cat === "culture" || e.cat === "patrimoine") ? "culture" : "autre";
  return { title: e.title, start: d, end: d, place: p.name, placeId: p.id, url: "", kind };
}).sort((a, b) => a.start - b.start);

const loadEvents = () => source("events", fetchEvents, sampleEvents);
const isOngoing = (e) => e.start < Date.now() && e.end > Date.now() && e.end - e.start > 864e5;
const whenOf = (e) => (isOngoing(e) ? new Date(Math.max(Date.now(), e.start)) : e.start);

// --- Le saviez-vous : résumé Wikipédia ---
const loadSavoir = () => source("savoir", async () => {
  const title = SAVOIR_TITLES[dayIndex() % SAVOIR_TITLES.length];
  const j = await getJSON(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
  if (!j.extract) throw new Error("résumé vide");
  return { title: j.title, text: j.extract, img: safeUrl(j.thumbnail?.source), url: safeUrl(j.content_urls?.mobile?.page || j.content_urls?.desktop?.page) };
}, () => {
  const p = PLACES[dayIndex() % PLACES.length];
  return { title: p.name, text: p.desc, img: "", url: "", placeId: p.id };
});

// =========================================================
// Widgets
// =========================================================
const WIDGETS = {
  meteo: {
    title: "Météo", icon: "sun", sizes: ["s", "l"], load: loadWeather, render: renderWeather,
    desc: "Température et prévisions sur trois jours.",
  },
  sport: {
    title: "Sport à Limoges", icon: "trophy", sizes: ["l"], load: () => loadSport(), render: renderSport, settings: openTeamSettings,
    desc: "Résultats et prochains matchs du CSP, du handball et du foot.",
    foot: `<a class="w-link" href="#agenda/sport">Agenda sportif ${ic("arrow")}</a>`,
  },
  agenda: {
    title: "Événements", icon: "calendar", sizes: ["s", "l"], load: loadEvents, render: (d, size) => renderEvents(d, size, null),
    desc: "Les prochains rendez-vous en ville.",
    foot: `<a class="w-link" href="#agenda">Tout l'agenda ${ic("arrow")}</a>`,
  },
  culture: {
    title: "Culture", icon: "palette", sizes: ["s", "l"], load: loadEvents, render: (d, size) => renderEvents(d, size, "culture"),
    desc: "Expositions, concerts et spectacles depuis l'agenda en ligne.",
    foot: `<a class="w-link" href="#agenda/culture">Toute la culture ${ic("arrow")}</a>`,
  },
  savoir: {
    title: "Le saviez-vous ?", icon: "bulb", sizes: ["s", "l"], load: loadSavoir, render: renderSavoir,
    desc: "Un lieu ou une tradition de Limoges chaque jour, via Wikipédia.",
  },
  limodoku: {
    title: "Limodoku", icon: "grid9", sizes: ["l"], render: renderDokuWidget,
    desc: "La grille façon Metrodoku avec les lieux de Limoges.",
    foot: `<a class="w-link" href="#jouer/doku">Jouer ${ic("arrow")}</a>`,
  },
  quiz: {
    title: "Quiz du jour", icon: "quiz", sizes: ["l"], render: renderQuizWidget,
    desc: "Une question sur Limoges chaque jour.",
    foot: `<a class="w-link" href="#jouer/quiz">Quiz complet ${ic("arrow")}</a>`,
  },
  plans: {
    title: "Bons plans", icon: "tag", sizes: ["l"], render: renderDeals, sample: true,
    desc: "Promotions des commerces de la ville.",
  },
  parcours: {
    title: "Parcours", icon: "route", sizes: ["l"], render: renderTours,
    desc: "Balades guidées à suivre sur la carte.",
  },
  actus: {
    title: "Actualités", icon: "news", sizes: ["l"], render: renderNews, sample: true,
    desc: "Les nouvelles de la ville et des quartiers.",
  },
  explorer: {
    title: "Explorer", icon: "compass", sizes: ["l"], render: renderExplorer,
    desc: "Les lieux de Limoges par catégorie.",
  },
};

const DEFAULT_LAYOUT = [
  { id: "meteo", size: "s" }, { id: "savoir", size: "s" }, { id: "limodoku", size: "l" }, { id: "sport", size: "l" }, { id: "agenda", size: "l" },
  { id: "culture", size: "l" }, { id: "quiz", size: "l" }, { id: "plans", size: "l" }, { id: "parcours", size: "l" },
];
const cleanLayout = (list) => list.filter((x, i, a) => WIDGETS[x.id] && a.findIndex((y) => y.id === x.id) === i)
  .map((x) => ({ id: x.id, size: WIDGETS[x.id].sizes.includes(x.size) ? x.size : WIDGETS[x.id].sizes[0] }));
let layout = cleanLayout(store.get("layout", DEFAULT_LAYOUT));
const saveLayout = () => store.set("layout", layout);
// Les pages déjà personnalisées reçoivent le nouveau widget Limodoku une seule fois
if (store.get("layoutRev", 1) < 2) {
  if (!layout.some((x) => x.id === "limodoku")) layout.splice(Math.min(2, layout.length), 0, { id: "limodoku", size: "l" });
  saveLayout();
  store.set("layoutRev", 2);
}
let editing = false;

const SKEL = `<div class="skel"><i></i><i></i><i></i></div>`;

function renderWeather(d, size) {
  const now = wxInfo(d.code), today = d.days[0] || { min: "–", max: "–" };
  const days = size === "l" ? `<div class="wx-days">${d.days.map((day, i) => {
    const w = wxInfo(day.code);
    const label = i === 0 ? "Auj." : new Date(day.date + "T12:00").toLocaleDateString("fr-FR", { weekday: "short" });
    return `<div class="wx-day"><b>${label}</b>${ic(w.icon)}<span>${day.min}° / ${day.max}°</span></div>`;
  }).join("")}</div>` : "";
  return `<div class="wx"><div><div class="wx-temp">${d.temp}°</div><div class="wx-label">${now.label}</div></div>${ic(now.icon)}</div>
    <div class="wx-range">Max ${today.max}° · Min ${today.min}°</div>${days}`;
}

function renderSport(teams) {
  return `<div class="teams">${teams.map((t) => {
    const l = t.last, n = t.next;
    const res = l && l.my !== null && l.their !== null ? (l.my > l.their ? "V" : l.my < l.their ? "D" : "N") : null;
    const img = t.badge ? `<img src="${esc(t.badge)}" alt="" loading="lazy" onerror="this.remove()">` : "";
    const lastLine = l ? `<div class="team-line">
        ${res ? `<span class="res ${res}" title="${{ V: "Victoire", D: "Défaite", N: "Nul" }[res]}">${res}</span><span class="score">${l.my} – ${l.their}</span>` : ""}
        <span>${l.home === false ? "à" : "vs"} ${esc(l.opp)} · ${fmtDM(new Date(l.date))}</span></div>` : "";
    const nextLine = n
      ? `<div class="team-line"><span class="next-dot">${ic("calendar")}</span><span>${fmtShort(new Date(n.date))} · ${fmtTime(new Date(n.date))} · ${n.home ? "vs" : "à"} ${esc(n.opp)}</span></div>`
      : `<div class="team-line">Pas de match programmé</div>`;
    return `<div class="team">
      <span class="crest" style="background:${t.color}">${esc(t.short)}${img}</span>
      <div><div class="team-top"><b>${esc(t.name)}</b><small>${esc(t.league)}${t.live ? "" : " · exemple"}</small></div>${lastLine}${nextLine}</div>
    </div>`;
  }).join("")}</div>`;
}

function evRow(e) {
  const ongoing = isOngoing(e), when = whenOf(e);
  const sub = ongoing ? `Jusqu'au ${fmtDM(e.end)}` : `${fmtShort(e.start)}${hasTime(e.start) ? " · " + fmtTime(e.start) : ""}`;
  const inner = `<span class="ev-date"><b>${when.getDate()}</b><small>${monthShort(when)}</small></span>
    <span class="ev-main"><strong class="ev-title">${esc(e.title)}</strong><span class="ev-sub">${sub} · ${esc(e.place)}</span></span>
    ${ic(e.url ? "external" : "arrow")}`;
  return e.url
    ? `<a class="ev" href="${esc(e.url)}" target="_blank" rel="noopener">${inner}</a>`
    : `<button class="ev" data-place="${e.placeId}">${inner}</button>`;
}

function renderEvents(d, size, kind) {
  const items = d.filter((e) => !kind || e.kind === kind);
  if (!items.length) return `<p class="empty">Rien de prévu pour le moment.</p>`;
  return `<div class="ev-list">${items.slice(0, size === "s" ? 2 : 4).map(evRow).join("")}</div>`;
}

function renderSavoir(d) {
  const img = d.img ? `<img class="savoir-img" src="${esc(d.img)}" alt="" loading="lazy" onerror="this.remove()">` : "";
  const more = d.url
    ? `<a class="w-link" href="${esc(d.url)}" target="_blank" rel="noopener">Lire sur Wikipédia ${ic("external")}</a>`
    : d.placeId ? `<button class="w-link" data-place="${d.placeId}">Voir le lieu ${ic("arrow")}</button>` : "";
  return `<div class="savoir">${img}<h3>${esc(d.title)}</h3><p>${esc(d.text)}</p>${more}</div>`;
}

function renderQuizWidget() {
  const q = QUIZ[dayIndex() % QUIZ.length];
  const done = store.get("quizDay", null);
  const picked = done && done.day === dayIndex() ? done.k : null;
  return `<p class="qz-q">${esc(q.q)}</p>
    <div class="qz-opts">${q.options.map((o, k) => {
      const cls = picked === null ? "" : k === q.answer ? "good" : k === picked ? "bad" : "";
      return `<button class="qz-opt ${cls}" data-qz="${k}" ${picked !== null ? "disabled" : ""}>${esc(o)}</button>`;
    }).join("")}</div>
    ${picked !== null ? `<p class="qz-fact">${picked === q.answer ? "Bonne réponse ! " : ""}${esc(q.fact)}</p>` : ""}`;
}

function renderDeals() {
  return `<div class="hscroll">${DEALS.map((d) => `
    <button class="deal" data-place="${d.place}">
      <span class="deal-offer">${esc(d.offer)}</span>
      <span class="deal-shop">${esc(d.shop)}</span>
      <span class="deal-detail">${esc(d.detail)}</span>
    </button>`).join("")}</div>`;
}

function renderTours() {
  return `<div class="hscroll">${TOURS.map((t) => `
    <a class="tour" href="#carte/parcours-${t.id}" style="background:${t.gradient}">
      <span class="tour-stops">${t.stops.length} étapes</span>
      <h3>${esc(t.title)}</h3><span>${t.duration} · ${t.km}</span>
    </a>`).join("")}</div>`;
}

function renderNews() {
  return NEWS.map((n) => `<article class="news-item"><span class="news-tag"></span>
    <div><h3>${esc(n.title)}</h3><p>${esc(n.tag)} · ${esc(n.time)}</p></div></article>`).join("");
}

function renderExplorer() {
  return `<div class="cat-grid">${Object.entries(CATEGORIES).map(([k, c]) => `
    <a class="cat-tile" href="#carte/${k}"><span class="bubble" style="background:${catGradient(k)}">${ic(c.icon)}</span>${c.label}</a>`).join("")}</div>`;
}

function widgetShell(item, i = 0, solo = false) {
  const def = WIDGETS[item.id];
  const sizeBtn = def.sizes.length > 1
    ? `<button class="tool" data-act="size" aria-label="${item.size === "s" ? "Agrandir" : "Réduire"}">${ic(item.size === "s" ? "resize" : "shrink")}</button>` : "";
  return `<section class="widget size-${item.size}${solo ? " solo" : ""}" data-w="${item.id}" style="animation-delay:${Math.min(i, 8) * 45}ms">
    <header class="w-head">${ic(def.icon)}<h2>${def.title}</h2><span class="w-badge"></span></header>
    <div class="w-body">${def.load ? SKEL : ""}</div>
    ${def.foot ? `<div class="w-foot">${def.foot}</div>` : ""}
    <div class="w-tools">
      <button class="tool grip" aria-label="Glisser pour déplacer">${ic("grip")}</button>
      <button class="tool" data-act="up" aria-label="Monter">${ic("up")}</button>
      <button class="tool" data-act="down" aria-label="Descendre">${ic("down")}</button>
      ${sizeBtn}
      ${def.settings ? `<button class="tool" data-act="settings" aria-label="Réglages">${ic("sliders")}</button>` : ""}
      <button class="tool danger" data-act="remove" aria-label="Retirer">${ic("x")}</button>
    </div>
  </section>`;
}

const setBadge = (badge, live) => {
  badge.className = "w-badge " + (live ? "live" : "sample");
  badge.textContent = live ? "En direct" : "Exemple";
  badge.title = live ? "Données en direct" : "Données d'exemple";
};
const sampleNote = (size, live) => (size === "s" && !live ? `<p class="w-note">Données d'exemple</p>` : "");

// Un widget demi-largeur sans voisin prend toute la largeur (pas de trou dans la grille)
function soloIds() {
  const solo = new Set();
  let open = null;
  layout.forEach((x) => {
    if (x.size === "s") open = open ? null : x.id;
    else { if (open) solo.add(open); open = null; }
  });
  if (open) solo.add(open);
  return solo;
}

async function fillWidget(el) {
  const def = WIDGETS[el.dataset.w];
  const size = el.classList.contains("size-s") ? "s" : "l";
  const body = $(".w-body", el), badge = $(".w-badge", el);
  if (!def.load) {
    body.innerHTML = def.render(null, size) + (def.sample ? sampleNote(size, false) : "");
    if (def.sample) setBadge(badge, false);
    return;
  }
  const res = await def.load();
  if (!el.isConnected) return;
  body.innerHTML = def.render(res.data, size) + sampleNote(size, res.live);
  setBadge(badge, res.live);
}

function renderGrid(focusId, focusAct) {
  const grid = $("#widgets");
  if (!grid) return;
  const solo = soloIds();
  grid.innerHTML = layout.map((x, i) => widgetShell(x, i, solo.has(x.id))).join("")
    + (editing ? `<button class="add-widget" id="add-widget">${ic("plus")} Ajouter un widget</button>` : "");
  grid.querySelectorAll(".widget").forEach(fillWidget);
  if (focusId) grid.querySelector(`[data-w="${focusId}"] [data-act="${focusAct}"]`)?.focus();
}

// =========================================================
// Écrans
// =========================================================
const screens = {
  mapage() {
    const name = store.get("name", "");
    const h = new Date().getHours();
    const hello = h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
    const top = editing
      ? `<div class="edit-panel glass">
          <label for="me-name">Votre prénom</label>
          <input class="field" id="me-name" maxlength="24" placeholder="Pour vous saluer" value="${esc(name)}" autocomplete="given-name">
          <div class="edit-panel-row"><span class="meta">Glissez la poignée ou utilisez les flèches pour réorganiser.</span>
          <button class="text-btn" id="reset-layout">Réinitialiser</button></div>
        </div>`
      : `<form class="search" id="home-search" role="search">
          ${ic("search")}
          <input name="q" placeholder="Un resto, un musée, un match…" autocomplete="off" aria-label="Rechercher">
          <button aria-label="Rechercher">${ic("arrow")}</button>
        </form>`;
    return `
      <div class="me-head">
        <div>
          <p class="eyebrow">${fmtDay(new Date())}</p>
          <h1>${hello}${name ? `,<br><span>${esc(name)}</span>` : ""}</h1>
        </div>
        <button class="edit-btn ${editing ? "on" : ""}" id="edit-toggle">${editing ? "Terminé" : `${ic("sliders")} Personnaliser`}</button>
      </div>
      ${top}
      <div class="widgets ${editing ? "editing" : ""}" id="widgets"></div>
      <p class="footnote">Ma page · Limoges, arts du feu et innovation</p>`;
  },

  carte() {
    view.classList.add("no-pad");
    const filters = [["all", "Tout", "sparkles"], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.label, c.icon])];
    return `
      <div class="map-wrap">
        <div id="map" aria-label="Carte interactive de Limoges"></div>
        <div class="map-overlay">
          <div class="chips" id="map-filters">
            ${filters.map(([k, l, i]) => `<button class="chip" data-filter="${k}">${ic(i)} ${l}</button>`).join("")}
            <button class="chip" id="locate">${ic("locate")} Autour de moi</button>
          </div>
        </div>
        <div class="map-zoom glass">
          <button id="zoom-in" aria-label="Zoomer">${ic("plus")}</button>
          <button id="zoom-out" aria-label="Dézoomer"><svg class="i" aria-hidden="true"><path d="M5 12h14"/></svg></button>
        </div>
        <div class="map-cards hscroll" id="map-cards"></div>
      </div>`;
  },

  agenda(param) {
    const active = ["culture", "sport", "autre"].includes(param) ? param : "all";
    const chips = [["all", "Tout", "sparkles"], ["culture", "Culture", "palette"], ["sport", "Sport", "trophy"], ["autre", "Autres", "calendar"]];
    return `
      <h1 class="page-title">Agenda</h1>
      <p class="page-sub">Ce qui se passe à Limoges dans les prochains jours.</p>
      <div class="chips">${chips.map(([k, l, i]) => `<a class="chip ${k === active ? "active" : ""}" href="#agenda/${k}">${ic(i)} ${l}</a>`).join("")}</div>
      <div class="agenda-list" id="agenda-list"><div class="skel" style="margin-top:24px"><i></i><i></i><i></i></div></div>`;
  },

  jouer(param) {
    const tab = param === "quiz" ? "quiz" : "doku";
    return `<h1 class="page-title">Jouer</h1>
      <p class="page-sub">Des jeux pour connaître Limoges par cœur.</p>
      <div class="chips">
        <a class="chip ${tab === "doku" ? "active" : ""}" href="#jouer/doku">${ic("grid9")} Limodoku</a>
        <a class="chip ${tab === "quiz" ? "active" : ""}" href="#jouer/quiz">${ic("quiz")} Quiz</a>
      </div>
      <div id="${tab}"></div>`;
  },

  guide() {
    view.classList.add("chat-view");
    return `
      <h1 class="page-title">Le Guide</h1>
      <p class="page-sub">Demandez un lieu, une sortie, un résultat de match…</p>
      <div class="chat" id="chat"></div>
      <form class="chat-input" id="chat-form">
        <input name="q" placeholder="Où manger près des Halles ?" autocomplete="off" aria-label="Votre question">
        <button class="send-btn" aria-label="Envoyer">${ic("send")}</button>
      </form>`;
  },
};

// =========================================================
// Routeur
// =========================================================
function route() {
  let [name, param] = (location.hash.slice(1) || "mapage").split("/");
  if (name === "accueil") name = "mapage";
  const screen = screens[name] ? name : "mapage";
  if (screen !== "mapage") editing = false;
  closeSheet();
  view.classList.remove("no-pad", "chat-view");
  destroyMap();
  view.innerHTML = screens[screen](param);
  view.scrollTop = 0;
  document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === screen));
  after[screen]?.(param);
}

const after = {
  mapage() {
    renderGrid();
    $("#edit-toggle").onclick = () => {
      editing = !editing;
      route();
      if (!editing) toast("Ma page est enregistrée");
    };
    const grid = $("#widgets");
    grid.addEventListener("click", onWidgetClick);
    grid.addEventListener("pointerdown", onGripDown);

    if (!editing) {
      $("#home-search").addEventListener("submit", (ev) => {
        ev.preventDefault();
        const q = ev.target.q.value.trim();
        if (!q) return;
        pendingQuestion = q;
        location.hash = "guide";
      });
      return;
    }
    $("#me-name").addEventListener("input", (ev) => store.set("name", ev.target.value.trim()));
    const reset = $("#reset-layout");
    reset.onclick = () => {
      if (!reset.dataset.armed) {
        reset.dataset.armed = "1";
        reset.textContent = "Confirmer la réinitialisation";
        return;
      }
      layout = cleanLayout(DEFAULT_LAYOUT);
      saveLayout();
      store.set("teams", ["csp", "hand"]);
      toast("Page réinitialisée");
      route();
    };
  },
  carte(param) { initMap(param); },
  agenda(param) { renderAgenda(param); },
  jouer(param) { param === "quiz" ? renderQuiz() : renderDoku(); },
  guide() { initChat(); },
};

window.addEventListener("hashchange", route);

// Ouverture de fiche depuis n'importe quel élément [data-place]
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-place]");
  if (el && el.dataset.place && !el.closest(".sheet")) openPlace(el.dataset.place);
});

// =========================================================
// Personnalisation de Ma page
// =========================================================
function onWidgetClick(e) {
  const qz = e.target.closest("[data-qz]");
  if (qz) {
    store.set("quizDay", { day: dayIndex(), k: +qz.dataset.qz });
    fillWidget(qz.closest(".widget"));
    return;
  }
  if (e.target.closest("#add-widget")) return openAddSheet();

  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const id = btn.closest(".widget").dataset.w;
  const i = layout.findIndex((x) => x.id === id);
  const act = btn.dataset.act;
  if (act === "up" && i > 0) {
    [layout[i - 1], layout[i]] = [layout[i], layout[i - 1]];
  } else if (act === "down" && i < layout.length - 1) {
    [layout[i + 1], layout[i]] = [layout[i], layout[i + 1]];
  } else if (act === "size") {
    layout[i].size = layout[i].size === "s" ? "l" : "s";
  } else if (act === "settings") {
    return WIDGETS[id].settings();
  } else if (act === "remove") {
    layout.splice(i, 1);
    toast(`« ${WIDGETS[id].title} » retiré`);
  } else {
    return;
  }
  saveLayout();
  renderGrid(act === "remove" ? null : id, act);
}

// Glisser-déposer avec la poignée (souris et tactile)
function onGripDown(e) {
  const grip = e.target.closest(".grip");
  if (!grip) return;
  e.preventDefault();
  const grid = $("#widgets"), card = grip.closest(".widget");
  card.classList.add("dragging");
  const move = (ev) => {
    const r = view.getBoundingClientRect();
    if (ev.clientY < r.top + 70) view.scrollTop -= 14;
    else if (ev.clientY > r.bottom - 130) view.scrollTop += 14;
    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".widget");
    if (!target || target === card || target.parentNode !== grid) return;
    const items = [...grid.querySelectorAll(".widget")];
    grid.insertBefore(card, items.indexOf(card) < items.indexOf(target) ? target.nextSibling : target);
  };
  const up = () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", up);
    card.classList.remove("dragging");
    const order = [...grid.querySelectorAll(".widget")].map((w) => w.dataset.w);
    layout.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    saveLayout();
    renderGrid();
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", up);
}

function openAddSheet() {
  const avail = Object.keys(WIDGETS).filter((id) => !layout.some((x) => x.id === id));
  const sheet = openSheet(`
    <div class="sheet-head"><h2>Ajouter un widget</h2><button class="sheet-close" aria-label="Fermer">${ic("x")}</button></div>
    ${avail.length ? `<div class="opt-list">${avail.map((id) => {
      const w = WIDGETS[id];
      return `<div class="opt-row"><span class="bubble">${ic(w.icon)}</span><span><b>${w.title}</b><p>${w.desc}</p></span>
        <button class="pill-add" data-add="${id}">${ic("plus")} Ajouter</button></div>`;
    }).join("")}</div>` : `<p class="sheet-note">Tous les widgets sont déjà sur votre page.</p>`}`);
  sheet.onclick = (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    const def = WIDGETS[b.dataset.add];
    layout.push({ id: b.dataset.add, size: def.sizes.includes("l") ? "l" : def.sizes[0] });
    saveLayout();
    closeSheet();
    renderGrid(b.dataset.add, "up");
    $(`[data-w="${b.dataset.add}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast(`« ${def.title} » ajouté`);
  };
}

function openTeamSettings() {
  const draw = () => {
    const sel = getTeams();
    return `
      <div class="sheet-head"><h2>Équipes suivies</h2><button class="sheet-close" aria-label="Fermer">${ic("x")}</button></div>
      <div class="opt-list">${TEAMS.map((t) => {
        const on = sel.includes(t.id);
        return `<button class="opt-row" data-team="${t.id}" role="switch" aria-checked="${on}">
          <span class="crest" style="background:${t.color}">${t.short}</span>
          <span><b>${t.name}</b><p>${t.label}</p></span><span class="switch ${on ? "on" : ""}"></span></button>`;
      }).join("")}</div>
      <p class="sheet-note">Les résultats viennent de TheSportsDB quand le service répond. Sinon, le widget affiche des exemples signalés comme tels.</p>`;
  };
  const sheet = openSheet(draw());
  sheet.onclick = (e) => {
    const b = e.target.closest("[data-team]");
    if (!b) return;
    const sel = getTeams();
    const next = sel.includes(b.dataset.team) ? sel.filter((x) => x !== b.dataset.team) : [...sel, b.dataset.team];
    if (!next.length) return toast("Gardez au moins une équipe");
    store.set("teams", TEAMS.map((t) => t.id).filter((id) => next.includes(id)));
    sheet.innerHTML = draw();
    sheet.querySelectorAll(".sheet-close").forEach((c) => (c.onclick = closeSheet));
    const w = $('[data-w="sport"]');
    if (w) fillWidget(w);
  };
}

// =========================================================
// Agenda
// =========================================================
async function renderAgenda(param) {
  const active = ["culture", "sport", "autre"].includes(param) ? param : "all";
  const res = await loadEvents();
  const list = $("#agenda-list");
  if (!list) return;
  const items = res.data.filter((e) => active === "all" || e.kind === active);
  const groups = [];
  items.forEach((e) => {
    const label = isOngoing(e) ? "En ce moment" : fmtDay(e.start);
    const g = groups.find((x) => x.label === label);
    g ? g.items.push(e) : groups.push({ label, items: [e] });
  });
  list.innerHTML = (groups.map((g) => `<p class="day-label">${g.label}</p>${g.items.map(evRow).join("")}`).join("")
      || `<p class="page-sub" style="margin-top:24px">Aucun événement pour ce filtre.</p>`)
    + `<p class="src-note"><span class="w-badge ${res.live ? "live" : "sample"}">${res.live ? "En direct" : "Exemple"}</span>
       ${res.live ? "Source : OpenAgenda" : "Agenda en ligne indisponible, événements d'exemple."}</p>`;
}

// =========================================================
// Carte
// =========================================================
let map = null, tiles = null, markers = [], routeLine = null, backdrop = null;

function setTiles() {
  const dark = document.documentElement.dataset.theme === "dark";
  if (tiles) map.removeLayer(tiles);
  tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "rastertiles/voyager"}/{z}/{x}/{y}{r}.png`, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd", maxZoom: 19,
  }).addTo(map);
  tiles.once("tileerror", drawPlan);
}

// Plan simplifié dessiné par l'app quand les tuiles ne chargent pas (hors ligne, réseau filtré)
const PLAN = {
  vienne: [[45.8236, 1.2300], [45.8232, 1.2400], [45.8238, 1.2480], [45.8247, 1.2560], [45.8252, 1.2615], [45.8258, 1.2675],
           [45.8268, 1.2740], [45.8285, 1.2800], [45.8305, 1.2860], [45.8330, 1.2940]],
  boulevards: [[45.8352, 1.2555], [45.8345, 1.2625], [45.8318, 1.2655], [45.8292, 1.2645], [45.8280, 1.2585], [45.8298, 1.2528], [45.8330, 1.2522], [45.8352, 1.2555]],
  rail: [[45.8363, 1.2680], [45.8420, 1.2692], [45.8490, 1.2660]],
  parks: [
    [[45.8284, 1.2652], [45.8284, 1.2690], [45.8268, 1.2692], [45.8266, 1.2656]],   // Jardins de l'Évêché
    [[45.8352, 1.2648], [45.8354, 1.2678], [45.8336, 1.2684], [45.8333, 1.2652]],   // Champ de Juillet
    [[45.8406, 1.2578], [45.8406, 1.2606], [45.8390, 1.2608], [45.8390, 1.2578]],   // Parc Victor Thuillat
  ],
  labels: [
    { at: [45.8325, 1.2572], text: "Le Château", cls: "district" },
    { at: [45.8292, 1.2708], text: "La Cité", cls: "district" },
    { at: [45.8378, 1.2710], text: "Gare", cls: "district" },
    { at: [45.8446, 1.2440], text: "Beaublanc", cls: "district" },
    { at: [45.8226, 1.2470], text: "La Vienne", cls: "river" },
    { at: [45.8238, 1.2560], text: "Pont St-Martial", cls: "bridge" },
    { at: [45.8249, 1.2690], text: "Pont St-Étienne", cls: "bridge" },
    { at: [45.8345, 1.2628], text: "Champ de Juillet", cls: "park" },
  ],
};

function drawPlan() {
  if (!map || backdrop) return;
  $("#map").classList.add("offline");
  const line = (pts, o) => L.polyline(pts, { interactive: false, lineCap: "round", lineJoin: "round", ...o });
  const label = (l) => L.marker(l.at, { interactive: false, keyboard: false,
    icon: L.divIcon({ className: "plan-label " + l.cls, html: `<span>${l.text}</span>`, iconSize: null }) });
  backdrop = L.layerGroup([
    L.circle([45.8280, 1.2668], { radius: 230, stroke: false, fillColor: "#3A9BDC", fillOpacity: .12, interactive: false }),
    L.polygon(PLAN.boulevards, { color: "#FFFFFF", weight: 1, opacity: .25, fillColor: "#FFFFFF", fillOpacity: .06, interactive: false }),
    line(PLAN.boulevards, { color: "#FFFFFF", weight: 6, opacity: .35 }),
    ...PLAN.parks.map((pts) => L.polygon(pts, { stroke: false, fillColor: "#2FB57A", fillOpacity: .45, interactive: false })),
    line(PLAN.rail, { color: "#FFFFFF", weight: 2, opacity: .45, dashArray: "6 6" }),
    line(PLAN.vienne, { color: "#3A9BDC", weight: 22, opacity: .45 }),
    line(PLAN.vienne, { color: "#8CCBF3", weight: 4, opacity: .95 }),
    ...PLAN.labels.map(label),
  ]).addTo(map);
  backdrop.eachLayer((l) => l.bringToBack?.());
  const note = document.createElement("p");
  note.className = "plan-note";
  note.textContent = "Plan simplifié · fond de carte indisponible";
  $(".map-wrap")?.appendChild(note);
}

function destroyMap() {
  if (map) { map.remove(); map = null; tiles = null; markers = []; routeLine = null; backdrop = null; }
}

function initMap(param) {
  if (typeof L === "undefined") {
    $("#map").innerHTML = `<p class="page-sub" style="padding:120px 24px;text-align:center">La carte nécessite une connexion internet.</p>`;
    return;
  }
  map = L.map("map", { zoomControl: false, attributionControl: true }).setView([45.8315, 1.2600], 15);
  setTiles();

  markers = PLACES.map((p) => {
    const icon = L.divIcon({
      className: "", iconSize: [38, 38], iconAnchor: [4, 38],
      html: `<div class="pin" style="background:${catGradient(p.cat)}">${ic(CATEGORIES[p.cat].icon)}</div>`,
    });
    const m = L.marker([p.lat, p.lng], { icon, title: p.name }).on("click", () => focusPlace(p.id, true));
    m.bindTooltip(p.name, { permanent: true, direction: "right", offset: [14, -22], className: "pin-label" });
    m.place = p;
    return m;
  });
  const syncLabels = () => $("#map")?.classList.toggle("labels-off", map.getZoom() < 15);
  map.on("zoomend", syncLabels);
  syncLabels();
  $("#zoom-in").onclick = () => map.zoomIn();
  $("#zoom-out").onclick = () => map.zoomOut();
  $("#map-cards").addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-focus]");
    if (c) focusPlace(c.dataset.focus, false);
  });

  const tour = param?.startsWith("parcours-") ? TOURS.find((t) => "parcours-" + t.id === param) : null;
  if (tour) showTour(tour);
  else applyFilter(CATEGORIES[param] ? param : "all");

  $("#map-filters").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-filter]");
    if (b) applyFilter(b.dataset.filter);
  });
  $("#locate").addEventListener("click", locate);
}

function applyFilter(cat) {
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  document.querySelectorAll("#map-filters [data-filter]").forEach((b) => b.classList.toggle("active", b.dataset.filter === cat));
  const shown = [];
  markers.forEach((m) => {
    const on = cat === "all" || m.place.cat === cat;
    on ? m.addTo(map) : m.remove();
    if (on) shown.push(m.getLatLng());
  });
  if (shown.length) map.fitBounds(L.latLngBounds(shown), FIT);
  renderMapCards(markers.filter((m) => cat === "all" || m.place.cat === cat).map((m) => m.place));
}

// Marges pour que les lieux ne passent pas sous les filtres ni sous la liste du bas
const FIT = { paddingTopLeft: [30, 70], paddingBottomRight: [30, 190], maxZoom: 16 };

function renderMapCards(places) {
  $("#map-cards").innerHTML = places.map((p) => `
    <button class="map-card glass" data-focus="${p.id}">
      <span class="bubble" style="background:${catGradient(p.cat)}">${ic(CATEGORIES[p.cat].icon)}</span>
      <span><b>${esc(p.name)}</b><small>${CATEGORIES[p.cat].label} · ${p.rating.toFixed(1)} ★</small></span>
    </button>`).join("");
}

// Centre la carte sur un lieu ; depuis une épingle, ouvre aussi sa fiche
function focusPlace(id, open) {
  const p = placeById[id];
  if (!map || !p) return;
  document.querySelectorAll(".map-card").forEach((c) => c.classList.toggle("active", c.dataset.focus === id));
  $(`.map-card[data-focus="${id}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  if (open) return openPlace(id);
  map.flyTo([p.lat, p.lng], 17, { duration: .6 });
  setTimeout(() => openPlace(id), 650);
}

function showTour(tour) {
  document.querySelectorAll("#map-filters [data-filter]").forEach((b) => b.classList.remove("active"));
  markers.forEach((m) => (tour.stops.includes(m.place.id) ? m.addTo(map) : m.remove()));
  const pts = tour.stops.map((id) => [placeById[id].lat, placeById[id].lng]);
  routeLine = L.polyline(pts, { color: "#FFD500", weight: 5, opacity: .95, dashArray: "2 10", lineCap: "round" }).addTo(map);
  map.fitBounds(routeLine.getBounds(), FIT);
  renderMapCards(tour.stops.map((id) => placeById[id]));
  toast(`Parcours « ${tour.title} » · ${tour.duration}`);
}

function locate() {
  if (!navigator.geolocation) return toast("Géolocalisation indisponible");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!map) return;
      const ll = [pos.coords.latitude, pos.coords.longitude];
      L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18] }) }).addTo(map);
      map.setView(ll, 15);
    },
    () => toast("Position non autorisée"),
  );
}

// =========================================================
// Panneaux : fiche lieu, réglages
// =========================================================
function openSheet(html) {
  const sheet = $("#sheet"), bd = $("#sheet-backdrop");
  sheet.onclick = null;
  sheet.innerHTML = html;
  sheet.hidden = false;
  bd.hidden = false;
  sheet.scrollTop = 0;
  sheet.querySelectorAll(".sheet-close").forEach((b) => (b.onclick = closeSheet));
  bd.onclick = closeSheet;
  return sheet;
}

function closeSheet() {
  $("#sheet").hidden = true;
  $("#sheet-backdrop").hidden = true;
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

function openPlace(id) {
  const p = placeById[id];
  if (!p) return;
  const isFav = store.get("favs", []).includes(id);
  const userReviews = store.get("reviews:" + id, []);
  const allReviews = [...userReviews, ...sampleReviews(p)];
  const events = EVENTS.filter((e) => e.place === id);
  const cover = p.photo
    ? `<div class="sheet-cover photo">`
    : `<div class="sheet-cover" style="background:${catGradient(p.cat)}">${ic(CATEGORIES[p.cat].icon)}`;

  const sheet = openSheet(`
    ${cover}<button class="sheet-close" aria-label="Fermer">${ic("x")}</button></div>
    <div class="sheet-body">
      <p class="eyebrow">${CATEGORIES[p.cat].label}</p>
      <h2>${esc(p.name)}</h2>
      <div class="rating-row">${stars(p.rating)} ${p.rating.toFixed(1)} · ${p.reviews + userReviews.length} avis</div>
      <p class="sheet-desc">${esc(p.desc)}</p>
      <div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="actions">
        <button class="btn ${isFav ? "flame" : "ghost"}" id="fav">${ic("heart")} ${isFav ? "Favori" : "Ajouter"}</button>
        <a class="btn" href="https://www.openstreetmap.org/directions?to=${p.lat},${p.lng}" target="_blank" rel="noopener">${ic("nav")} Itinéraire</a>
      </div>
      ${events.length ? `<p class="section-title">Événements</p>
        ${events.map((e) => `<p style="margin-top:8px"><b>${esc(e.title)}</b> <span class="meta">— ${fmtDay(new Date(e.date))}, ${fmtTime(new Date(e.date))}</span></p>`).join("")}` : ""}
      <p class="section-title">Avis</p>
      <form class="review-form" id="review-form">
        <div class="star-input" role="radiogroup" aria-label="Votre note">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} étoile${n > 1 ? "s" : ""}">${ic("star")}</button>`).join("")}
        </div>
        <textarea class="field" id="review-text" name="text" placeholder="Partagez votre expérience…" maxlength="400"></textarea>
        <button class="btn flame">Publier mon avis</button>
      </form>
      <div style="margin-top:14px">
        ${allReviews.map((r) => `<div class="review"><b>${esc(r.author)}</b>${stars(r.stars)}<p>${esc(r.text)}</p></div>`).join("")}
      </div>
    </div>`);

  $("#fav", sheet).onclick = () => {
    const list = store.get("favs", []);
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    store.set("favs", next);
    toast(next.includes(id) ? "Ajouté aux favoris" : "Retiré des favoris");
    openPlace(id);
  };

  let rating = 0;
  sheet.querySelectorAll("[data-star]").forEach((b) => {
    b.onclick = () => {
      rating = +b.dataset.star;
      sheet.querySelectorAll("[data-star]").forEach((s) => s.classList.toggle("on", +s.dataset.star <= rating));
    };
  });
  $("#review-form", sheet).onsubmit = (ev) => {
    ev.preventDefault();
    const text = ev.target.text.value.trim();
    if (!rating) return toast("Choisissez une note");
    if (!text) return toast("Écrivez quelques mots");
    store.set("reviews:" + id, [{ author: "Vous", stars: rating, text }, ...store.get("reviews:" + id, [])]);
    toast("Merci pour votre avis !");
    openPlace(id);
  };
}

function sampleReviews(p) {
  const pool = [
    { author: "Camille", stars: 5, text: "Un incontournable, on y retourne à chaque fois !" },
    { author: "Hugo", stars: 4, text: "Très beau lieu, un peu de monde le week-end." },
    { author: "Inès", stars: 5, text: "Parfait pour faire découvrir Limoges à des amis." },
  ];
  const i = p.id.length % pool.length;
  return [pool[i], pool[(i + 1) % pool.length]];
}

// =========================================================
// Quiz
// =========================================================
const BADGES = [
  { min: 1, label: "Première flamme" },
  { min: 4, label: "Apprenti porcelainier" },
  { min: 6, label: "Limougeaud d'or" },
];

function renderQuiz(state = { i: 0, score: 0, answered: false }) {
  const root = $("#quiz");
  if (!root) return;
  const best = store.get("quizBest", 0);
  const played = store.get("quizPlayed", 0);

  if (state.i >= QUIZ.length) {
    const pct = Math.round((state.score / QUIZ.length) * 100);
    const newBest = Math.max(best, state.score);
    store.set("quizBest", newBest);
    store.set("quizPlayed", played + 1);
    root.innerHTML = `
      <div class="glass quiz-card score-hero">
        <div class="score-ring" style="background:conic-gradient(var(--red), var(--orange), var(--yellow) ${pct}%, rgba(255,255,255,.14) 0)">
          <div>${state.score}/${QUIZ.length}</div>
        </div>
        <h2>${pct >= 80 ? "Bravo, vrai Limougeaud !" : pct >= 50 ? "Pas mal du tout !" : "Il reste des choses à découvrir !"}</h2>
        <p class="page-sub">+${state.score * 10} points gagnés</p>
        <button class="btn flame block" id="restart">Rejouer</button>
      </div>
      <div class="stats">
        <div class="glass stat"><b>${newBest}</b><small>Meilleur score</small></div>
        <div class="glass stat"><b>${played + 1}</b><small>Parties</small></div>
        <div class="glass stat"><b>${newBest * 10}</b><small>Points</small></div>
      </div>
      <p class="section-title">Badges</p>
      <div class="badges">${BADGES.map((b) => `<span class="badge ${newBest >= b.min ? "" : "locked"}">${ic("flame")} ${b.label}</span>`).join("")}</div>`;
    $("#restart").onclick = () => renderQuiz();
    return;
  }

  const q = QUIZ[state.i];
  root.innerHTML = `
    <div class="glass quiz-card">
      <div class="quiz-top"><span>Question ${state.i + 1}/${QUIZ.length}</span><span>${ic("flame")} ${state.score * 10} pts</span></div>
      <div class="progress"><i style="width:${(state.i / QUIZ.length) * 100}%"></i></div>
      <p class="quiz-q">${esc(q.q)}</p>
      <div class="options">
        ${q.options.map((o, k) => `<button class="option" data-k="${k}"><span class="letter">${"ABCD"[k]}</span>${esc(o)}</button>`).join("")}
      </div>
      <div id="after"></div>
    </div>`;

  root.querySelectorAll(".option").forEach((btn) => {
    btn.onclick = () => {
      if (state.answered) return;
      state.answered = true;
      const ok = +btn.dataset.k === q.answer;
      if (ok) state.score++;
      root.querySelectorAll(".option").forEach((b) => {
        if (+b.dataset.k === q.answer) b.classList.add("good");
        else if (b === btn) b.classList.add("bad");
      });
      $("#after").innerHTML = `
        <p class="fact">${ok ? "Exact !" : "Raté."} ${esc(q.fact)}</p>
        <button class="btn block" id="next">${state.i + 1 < QUIZ.length ? "Question suivante" : "Voir mon score"}</button>`;
      $("#next").onclick = () => renderQuiz({ i: state.i + 1, score: state.score, answered: false });
    };
  });
}

// =========================================================
// Limodoku (grille façon Metrodoku)
// =========================================================
const dokuPlace = (id) => DOKU.places.find((p) => p.id === id);
const dokuState = () => store.get("doku", { cells: {}, errors: 0 });
const zoneText = (zone) => DOKU.rows.find((r) => r.id === zone)?.text || DOKU.outside;
const dokuFits = (p, ri, ci) => p.zone === DOKU.rows[ri].id && p.tags.includes(DOKU.cols[ci].id);

function renderDokuWidget() {
  const st = dokuState(), n = Object.keys(st.cells).length;
  const mini = [0, 1, 2].map((r) => [0, 1, 2].map((c) => `<i class="${st.cells[`${r}-${c}`] ? "on" : ""}"></i>`).join("")).join("");
  const line = n === 9 ? "Grille terminée, bravo !" : n ? `Grille en cours : ${n}/9` : "Placez 9 lieux de Limoges dans la grille.";
  return `<div class="doku-mini-wrap"><div class="doku-mini" aria-hidden="true">${mini}</div>
    <div><p class="qz-q">${line}</p><p class="qz-fact">Chaque lieu doit correspondre à sa ligne et à sa colonne, comme le Metrodoku.</p></div></div>`;
}

function renderDoku(popKey) {
  const root = $("#doku");
  if (!root) return;
  const st = dokuState(), filled = Object.keys(st.cells).length;
  const head = (x, cls) => `<div class="doku-head ${cls}"><b>${x.label}</b><small>${x.hint}</small></div>`;
  const cells = DOKU.rows.map((r, ri) => head(r, "row") + DOKU.cols.map((c, ci) => {
    const key = `${ri}-${ci}`, p = st.cells[key] && dokuPlace(st.cells[key]);
    return p
      ? `<div class="doku-cell ok ${key === popKey ? "pop" : ""}">${ic(p.icon)}<span>${esc(p.name.replace(/ \(.*\)$/, ""))}</span></div>`
      : `<button class="doku-cell" data-cell="${key}" aria-label="Case ${r.label} et ${c.label}">${ic("plus")}</button>`;
  }).join("")).join("");
  root.innerHTML = `
    <div class="glass doku-card">
      <div class="doku-top"><span>${filled}/9 cases</span><span>${st.errors} erreur${st.errors > 1 ? "s" : ""}</span></div>
      <div class="doku-grid">
        <div class="doku-corner"><svg><use href="#logo"/></svg></div>
        ${DOKU.cols.map((c) => head(c, "col")).join("")}
        ${cells}
      </div>
      ${filled === 9
        ? `<div class="doku-win">${ic("flame")} Bravo ! Grille terminée avec ${st.errors} erreur${st.errors > 1 ? "s" : ""}.</div>`
        : `<p class="doku-help">Touchez une case, puis choisissez un lieu qui correspond à sa ligne <b>et</b> à sa colonne. Chaque lieu ne sert qu'une fois.</p>`}
      <div class="doku-actions"><button class="btn ghost" id="doku-reset">${ic("refresh")} Recommencer</button></div>
    </div>`;
  root.querySelectorAll("[data-cell]").forEach((b) => (b.onclick = () => openDokuPicker(b.dataset.cell)));
  $("#doku-reset").onclick = () => { store.set("doku", { cells: {}, errors: 0 }); renderDoku(); };
}

function openDokuPicker(key) {
  const [ri, ci] = key.split("-").map(Number);
  const r = DOKU.rows[ri], c = DOKU.cols[ci];
  const used = new Set(Object.values(dokuState().cells));
  const sheet = openSheet(`
    <div class="sheet-head"><div><p class="eyebrow">${r.label} × ${c.label}</p><h2>Choisissez un lieu</h2></div>
      <button class="sheet-close" aria-label="Fermer">${ic("x")}</button></div>
    <p class="sheet-note"><button class="text-btn" id="doku-hint">${ic("bulb")} Besoin d'un indice ?</button></p>
    <p class="doku-feedback" id="doku-fb" role="status"></p>
    <div class="opt-list">${DOKU.places.filter((p) => !used.has(p.id)).map((p) => `
      <button class="opt-row" data-pick="${p.id}"><span class="bubble">${ic(p.icon)}</span><span><b>${esc(p.name)}</b></span>${ic("arrow")}</button>`).join("")}
    </div>`);
  const fb = $("#doku-fb", sheet);
  sheet.onclick = (e) => {
    if (e.target.closest("#doku-hint")) {
      const ok = DOKU.places.find((p) => !used.has(p.id) && dokuFits(p, ri, ci));
      fb.className = "doku-feedback hint";
      fb.textContent = ok ? `Essayez : ${ok.name}.` : "Aucun lieu restant ne convient : recommencez la grille.";
      sheet.scrollTop = 0;
      return;
    }
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    const p = dokuPlace(b.dataset.pick), st = dokuState();
    if (dokuFits(p, ri, ci)) {
      st.cells[key] = p.id;
      store.set("doku", st);
      closeSheet();
      renderDoku(key);
      toast(Object.keys(st.cells).length === 9 ? "Grille terminée !" : "Bien vu !");
      return;
    }
    st.errors++;
    store.set("doku", st);
    const why = [];
    if (p.zone !== r.id) why.push(`est ${zoneText(p.zone)}, pas ${r.text}`);
    if (!p.tags.includes(c.id)) why.push(c.fail);
    fb.className = "doku-feedback bad";
    fb.textContent = `Raté : ${p.name.replace(/ \(.*\)$/, "")} ${why.join(" et ")}.`;
    b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake");
    sheet.scrollTop = 0;
  };
}

// =========================================================
// Guide (chat simple par mots-clés)
// =========================================================
let pendingQuestion = null;
const INTENTS = [
  { keys: ["manger", "resto", "restaurant", "dejeuner", "diner", "faim", "marche"], cat: "resto", say: "Pour bien manger, voici mes adresses :" },
  { keys: ["musee", "culture", "expo", "porcelaine", "email", "art", "spectacle", "opera"], cat: "culture", say: "Côté culture et arts du feu :" },
  { keys: ["histoire", "monument", "visite", "patrimoine", "cathedrale", "gare", "medieval"], cat: "patrimoine", say: "Les incontournables du patrimoine :" },
  { keys: ["parc", "jardin", "balade", "nature", "promenade", "vert", "enfant"], cat: "nature", say: "Pour prendre l'air :" },
  { keys: ["shopping", "boutique", "commerce", "acheter", "cafe", "terrasse"], cat: "shopping", say: "Pour flâner et faire du shopping :" },
];

async function answer(q) {
  const n = norm(q);
  if (/\b(csp|basket|handball|hand|foot|football|match|resultat|score)\b/.test(n)) {
    const res = await loadSport();
    const lines = res.data.map((t) => {
      const l = t.last, nx = t.next;
      const r = l && l.my !== null ? `${l.my > l.their ? "victoire" : l.my < l.their ? "défaite" : "nul"} ${l.my}–${l.their} contre ${l.opp}` : "pas de résultat récent";
      return `${t.name} : ${r}${nx ? `. Prochain match ${fmtShort(new Date(nx.date))} contre ${nx.opp}` : ""}.`;
    });
    return { text: lines.join(" ") + (res.live ? "" : " (données d'exemple)"), places: [placeById.beaublanc] };
  }
  if (/(meteo|temps|pluie|soleil|temperature)/.test(n)) {
    const res = await loadWeather();
    const w = wxInfo(res.data.code);
    return { text: `À Limoges : ${res.data.temp}°, ${w.label.toLowerCase()}.${res.live ? "" : " (données d'exemple)"}` };
  }
  const direct = PLACES.filter((p) => n.includes(norm(p.name)) || norm(p.name).split(" ").some((w) => w.length > 5 && n.includes(w)));
  if (direct.length) return { text: "Voici ce que j'ai trouvé :", places: direct };
  if (/(sortie|evenement|ce soir|week|agenda|concert)/.test(n)) {
    const res = await loadEvents();
    const next = res.data.slice(0, 3);
    return { text: "Prochains rendez-vous : " + next.map((e) => `${e.title} (${fmtShort(whenOf(e))})`).join(" · ") + (res.live ? "" : " (exemples)"),
      places: next.map((e) => placeById[e.placeId]).filter(Boolean) };
  }
  if (/(bon plan|promo|reduction|offre)/.test(n)) {
    return { text: "Les bons plans du moment : " + DEALS.map((d) => `${d.offer} chez ${d.shop}`).join(" · "), places: DEALS.map((d) => placeById[d.place]) };
  }
  const intent = INTENTS.find((it) => it.keys.some((k) => n.includes(k)));
  if (intent) return { text: intent.say, places: PLACES.filter((p) => p.cat === intent.cat).sort((a, b) => b.rating - a.rating) };
  return { text: "Je n'ai pas encore la réponse. Essayez « un resto », « un musée », « le score du CSP » ou « ce week-end »." };
}

function initChat() {
  const chat = $("#chat");
  const add = (html, who) => {
    const m = document.createElement("div");
    m.className = "msg " + who;
    m.innerHTML = html;
    chat.appendChild(m);
    view.scrollTop = view.scrollHeight;
  };
  const reply = async (q) => {
    add(esc(q), "me");
    const [r] = await Promise.all([answer(q), new Promise((ok) => setTimeout(ok, 350))]);
    if (!chat.isConnected) return;
    const links = (r.places || []).map((p) => `<button class="place-link" data-place="${p.id}">${ic(CATEGORIES[p.cat].icon)} ${esc(p.name)}</button>`).join("");
    add(esc(r.text) + (links ? "<br>" + links : ""), "bot");
  };

  add(`Bonjour ! Je suis le guide de Limoges. Que cherchez-vous aujourd'hui ?
    <div class="suggestions">
      ${["Où manger ?", "Un musée", "Le score du CSP", "Ce week-end", "Quel temps fait-il ?"].map((s) => `<button class="chip" data-suggest="${s}">${s}</button>`).join("")}
    </div>`, "bot");

  chat.addEventListener("click", (e) => {
    const s = e.target.closest("[data-suggest]");
    if (s) reply(s.dataset.suggest);
  });
  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    if (!q) return;
    e.target.q.value = "";
    reply(q);
  });

  if (pendingQuestion) { reply(pendingQuestion); pendingQuestion = null; }
}

route();
