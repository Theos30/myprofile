// Limoges — app V1 (carte, agenda, bons plans, parcours, quiz, guide)

const $ = (sel, root = document) => root.querySelector(sel);
const view = $("#view");
const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ---------- Stockage local (préférences, favoris, avis, score) ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("lim:" + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("lim:" + key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  },
};

// ---------- Utilitaires ----------
const fmtDay = (d) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtTime = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
const catGradient = (cat) => ({
  patrimoine: "var(--ocean)", culture: "linear-gradient(145deg, var(--blue), var(--sky))",
  resto: "var(--flame)", nature: "var(--forest)",
  sport: "linear-gradient(145deg, var(--red), var(--orange))",
  shopping: "linear-gradient(145deg, var(--orange), var(--yellow))",
}[cat]);

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---------- Thème ----------
(function initTheme() {
  const saved = store.get("theme", null);
  const system = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = saved || system;
  $("#theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
    if (map) setTiles();
  });
})();

// =========================================================
// Écrans
// =========================================================
const screens = {
  accueil() {
    const hour = new Date().getHours();
    const hello = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    const upcoming = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date));

    return `
      <section class="hero">
        <p class="hero-kicker">${hello} 👋</p>
        <h1>Tout <span>Limoges</span> dans votre poche.</h1>
        <form class="search" id="home-search">
          <input name="q" placeholder="Un resto, un musée, un bon plan…" autocomplete="off" aria-label="Rechercher">
          <button aria-label="Rechercher">→</button>
        </form>
      </section>

      <section class="section">
        <div class="cat-grid">
          ${Object.entries(CATEGORIES).map(([k, c]) => `
            <a class="cat-tile" href="#carte/${k}">
              <span class="bubble" style="background:${catGradient(k)}">${c.icon}</span>${c.label}
            </a>`).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>À venir</h2><a class="link" href="#agenda">Tout l'agenda</a></div>
        <div class="hscroll">${upcoming.map(eventCard).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Bons plans</h2></div>
        <div class="hscroll">
          ${DEALS.map((d) => `
            <button class="card deal" data-place="${d.place}">
              <span class="deal-offer">${esc(d.offer)}</span>
              <span class="deal-shop">${esc(d.shop)}</span>
              <span class="deal-detail">${esc(d.detail)}</span>
            </button>`).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Parcours</h2></div>
        <div class="hscroll">
          ${TOURS.map((t) => `
            <a class="tour" href="#carte/parcours-${t.id}" style="background:${t.gradient}">
              <span class="tour-stops">${t.stops.length} étapes</span>
              <h3>${esc(t.title)}</h3>
              <span class="meta">${t.duration} · ${t.km}</span>
            </a>`).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Actualités</h2></div>
        <div class="card news">
          ${NEWS.map((n) => `
            <article class="news-item">
              <span class="news-tag">${esc(n.tag.slice(0, 5))}</span>
              <div><h3>${esc(n.title)}</h3><p class="meta">${esc(n.tag)} · ${esc(n.time)}</p></div>
            </article>`).join("")}
        </div>
      </section>

      <p class="footnote">Limoges · Arts du feu et innovation<br>Version de démonstration — données d'exemple</p>
    `;
  },

  carte(param) {
    view.classList.add("no-pad");
    const filters = [["all", "Tout", "✨"], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.label, c.icon])];
    return `
      <div class="map-wrap">
        <div id="map" aria-label="Carte interactive de Limoges"></div>
        <div class="map-overlay">
          <div class="chips" id="map-filters">
            ${filters.map(([k, l, i]) => `<button class="chip" data-filter="${k}">${i} ${l}</button>`).join("")}
            <button class="chip" id="locate">📍 Autour de moi</button>
          </div>
        </div>
      </div>`;
  },

  agenda(param) {
    const active = param || "all";
    const list = EVENTS
      .filter((e) => active === "all" || e.cat === active)
      .sort((a, b) => a.date.localeCompare(b.date));
    const byDay = {};
    list.forEach((e) => { (byDay[e.date.slice(0, 10)] ||= []).push(e); });
    const cats = ["all", ...new Set(EVENTS.map((e) => e.cat))];

    return `
      <h1 class="page-title">Agenda</h1>
      <p class="page-sub">Concerts, matchs, marchés : ce qui bouge à Limoges.</p>
      <div class="chips">
        ${cats.map((c) => `<a class="chip ${c === active ? "active" : ""}" href="#agenda/${c}">
          ${c === "all" ? "✨ Tout" : CATEGORIES[c].icon + " " + CATEGORIES[c].label}</a>`).join("")}
      </div>
      <div>
        ${Object.entries(byDay).map(([day, evs]) => `
          <p class="day-label">${fmtDay(new Date(day + "T12:00"))}</p>
          ${evs.map((e) => {
            const d = new Date(e.date), p = placeById[e.place];
            return `
              <button class="card agenda-item" data-place="${p.id}">
                <span class="agenda-time" style="background:${catGradient(e.cat)}"><b>${fmtTime(d)}</b><small>${CATEGORIES[e.cat].icon}</small></span>
                <span><h3>${esc(e.title)}</h3><p class="meta">${esc(p.name)} · ${esc(e.price)}</p></span>
              </button>`;
          }).join("")}`).join("") || `<p class="page-sub">Aucun événement pour ce filtre.</p>`}
      </div>`;
  },

  jouer() {
    return `<h1 class="page-title">Quiz Limoges</h1>
      <p class="page-sub">Testez vos connaissances et gagnez des badges.</p>
      <div id="quiz"></div>`;
  },

  guide() {
    view.classList.add("chat-view");
    return `
      <h1 class="page-title">Le Guide</h1>
      <p class="page-sub">Demandez-moi un lieu, une sortie, un resto…</p>
      <div class="chat" id="chat"></div>
      <form class="chat-input" id="chat-form">
        <input name="q" placeholder="Où manger près des Halles ?" autocomplete="off" aria-label="Votre question">
        <button aria-label="Envoyer">↑</button>
      </form>`;
  },
};

function eventCard(e) {
  const d = new Date(e.date), p = placeById[e.place];
  return `
    <button class="card event-card" data-place="${p.id}">
      <div class="event-cover" style="background:${catGradient(e.cat)}">
        <span class="date-badge"><b>${d.getDate()}</b><small>${d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</small></span>
        <span class="emoji">${CATEGORIES[e.cat].icon}</span>
      </div>
      <div class="event-body">
        <h3>${esc(e.title)}</h3>
        <p class="meta">${esc(p.name)} · ${fmtTime(d)}</p>
        <span class="price">${esc(e.price)}</span>
      </div>
    </button>`;
}

// =========================================================
// Routeur
// =========================================================
function route() {
  const [name, param] = (location.hash.slice(1) || "accueil").split("/");
  const screen = screens[name] ? name : "accueil";
  closeSheet();
  view.classList.remove("no-pad", "chat-view");
  destroyMap();
  view.innerHTML = screens[screen](param);
  view.scrollTop = 0;
  document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === screen));
  after[screen]?.(param);
}

const after = {
  accueil() {
    $("#home-search").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const q = ev.target.q.value.trim();
      if (!q) return;
      pendingQuestion = q;
      location.hash = "guide";
    });
  },
  carte(param) { initMap(param); },
  jouer() { renderQuiz(); },
  guide() { initChat(); },
};

window.addEventListener("hashchange", route);

// Ouverture de fiche depuis n'importe quel élément [data-place]
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-place]");
  if (el && !el.closest(".sheet")) openPlace(el.dataset.place);
});

// =========================================================
// Carte
// =========================================================
let map = null, tiles = null, markers = [], routeLine = null;

function setTiles() {
  const dark = document.documentElement.dataset.theme === "dark";
  if (tiles) map.removeLayer(tiles);
  tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "rastertiles/voyager"}/{z}/{x}/{y}{r}.png`, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd", maxZoom: 19,
  }).addTo(map);
}

function destroyMap() {
  if (map) { map.remove(); map = null; tiles = null; markers = []; routeLine = null; }
}

function initMap(param) {
  if (typeof L === "undefined") {
    $("#map").innerHTML = `<p class="page-sub" style="padding:80px 24px;text-align:center">La carte nécessite une connexion internet.</p>`;
    return;
  }
  map = L.map("map", { zoomControl: false, attributionControl: true }).setView([45.8315, 1.2600], 15);
  setTiles();

  markers = PLACES.map((p) => {
    const c = CATEGORIES[p.cat];
    const icon = L.divIcon({
      className: "", iconSize: [38, 38], iconAnchor: [4, 38],
      html: `<div class="pin" style="background:${catGradient(p.cat)}"><span>${c.icon}</span></div>`,
    });
    const m = L.marker([p.lat, p.lng], { icon, title: p.name }).on("click", () => openPlace(p.id));
    m.place = p;
    return m;
  });

  const tour = param?.startsWith("parcours-") ? TOURS.find((t) => "parcours-" + t.id === param) : null;
  if (tour) {
    showTour(tour);
  } else {
    applyFilter(CATEGORIES[param] ? param : "all");
  }

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
  if (shown.length) map.fitBounds(L.latLngBounds(shown).pad(0.3), { maxZoom: 16 });
}

function showTour(tour) {
  document.querySelectorAll("#map-filters [data-filter]").forEach((b) => b.classList.remove("active"));
  const stops = tour.stops.map((id) => placeById[id]);
  markers.forEach((m) => (tour.stops.includes(m.place.id) ? m.addTo(map) : m.remove()));
  const pts = stops.map((p) => [p.lat, p.lng]);
  routeLine = L.polyline(pts, { color: "#E3161B", weight: 5, opacity: .85, dashArray: "2 10", lineCap: "round" }).addTo(map);
  map.fitBounds(routeLine.getBounds().pad(0.35));
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
// Fiche lieu (bottom sheet) + avis
// =========================================================
function openPlace(id) {
  const p = placeById[id];
  if (!p) return;
  const sheet = $("#sheet"), backdrop = $("#sheet-backdrop");
  const favs = store.get("favs", []);
  const isFav = favs.includes(id);
  const userReviews = store.get("reviews:" + id, []);
  const allReviews = [...userReviews, ...sampleReviews(p)];
  const events = EVENTS.filter((e) => e.place === id);

  sheet.innerHTML = `
    <div class="sheet-cover" style="background:${catGradient(p.cat)}">
      ${CATEGORIES[p.cat].icon}
      <button class="sheet-close" aria-label="Fermer">✕</button>
    </div>
    <div class="sheet-body">
      <p class="meta">${CATEGORIES[p.cat].label}</p>
      <h2>${esc(p.name)}</h2>
      <div class="rating-row"><span class="stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} · ${p.reviews + userReviews.length} avis</div>
      <p class="sheet-desc">${esc(p.desc)}</p>
      <div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="actions">
        <button class="btn ${isFav ? "flame" : "ghost"}" id="fav">${isFav ? "♥ Favori" : "♡ Favori"}</button>
        <a class="btn" href="https://www.openstreetmap.org/directions?to=${p.lat},${p.lng}" target="_blank" rel="noopener">Itinéraire</a>
      </div>
      ${events.length ? `
        <div class="section"><div class="section-head"><h2>Événements</h2></div>
          ${events.map((e) => `<p><b>${esc(e.title)}</b> <span class="meta">— ${fmtDay(new Date(e.date))}, ${fmtTime(new Date(e.date))}</span></p>`).join("")}
        </div>` : ""}
      <div class="section">
        <div class="section-head"><h2>Avis</h2></div>
        <form class="review-form" id="review-form">
          <div class="star-input" role="radiogroup" aria-label="Votre note">
            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} étoile${n > 1 ? "s" : ""}">★</button>`).join("")}
          </div>
          <textarea name="text" placeholder="Partagez votre expérience…" maxlength="400"></textarea>
          <button class="btn flame">Publier mon avis</button>
        </form>
        <div id="reviews" style="margin-top:14px">
          ${allReviews.map((r) => `
            <div class="review"><b>${esc(r.author)}</b> <span class="stars">${stars(r.stars)}</span><p>${esc(r.text)}</p></div>`).join("")}
        </div>
      </div>
    </div>`;

  sheet.hidden = false;
  backdrop.hidden = false;

  $(".sheet-close", sheet).onclick = closeSheet;
  backdrop.onclick = closeSheet;

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

function closeSheet() {
  $("#sheet").hidden = true;
  $("#sheet-backdrop").hidden = true;
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

// =========================================================
// Quiz
// =========================================================
const BADGES = [
  { min: 1, label: "🔥 Première flamme" },
  { min: 4, label: "🏺 Apprenti porcelainier" },
  { min: 6, label: "👑 Limougeaud d'or" },
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
      <div class="card score-hero quiz-card">
        <div class="score-ring" style="background:conic-gradient(var(--red), var(--orange), var(--yellow) ${pct}%, var(--surface-2) 0)">
          <div>${state.score}/${QUIZ.length}</div>
        </div>
        <h2>${pct >= 80 ? "Bravo, vrai Limougeaud !" : pct >= 50 ? "Pas mal du tout !" : "Il reste des choses à découvrir !"}</h2>
        <p class="page-sub">+${state.score * 10} points gagnés</p>
        <button class="btn flame block" id="restart">Rejouer</button>
      </div>
      <div class="stats">
        <div class="card stat"><b>${newBest}</b><small>Meilleur score</small></div>
        <div class="card stat"><b>${played + 1}</b><small>Parties</small></div>
        <div class="card stat"><b>${newBest * 10}</b><small>Points</small></div>
      </div>
      <div class="section"><div class="section-head"><h2>Badges</h2></div>
        <div class="badges">${BADGES.map((b) => `<span class="badge ${newBest >= b.min ? "" : "locked"}">${b.label}</span>`).join("")}</div>
      </div>`;
    $("#restart").onclick = () => renderQuiz();
    return;
  }

  const q = QUIZ[state.i];
  root.innerHTML = `
    <div class="card quiz-card">
      <div class="quiz-top"><span>Question ${state.i + 1}/${QUIZ.length}</span><span>🔥 ${state.score * 10} pts</span></div>
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
      const k = +btn.dataset.k, ok = k === q.answer;
      if (ok) state.score++;
      root.querySelectorAll(".option").forEach((b) => {
        if (+b.dataset.k === q.answer) b.classList.add("good");
        else if (b === btn) b.classList.add("bad");
      });
      $("#after").innerHTML = `
        <p class="fact">${ok ? "✅ Exact !" : "❌ Raté."} ${esc(q.fact)}</p>
        <button class="btn block" id="next">${state.i + 1 < QUIZ.length ? "Question suivante" : "Voir mon score"}</button>`;
      $("#next").onclick = () => renderQuiz({ i: state.i + 1, score: state.score, answered: false });
    };
  });
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
  { keys: ["sport", "basket", "csp", "match", "courir", "run"], cat: "sport", say: "Pour les sportifs et les supporters :" },
  { keys: ["shopping", "boutique", "commerce", "acheter", "cafe", "terrasse"], cat: "shopping", say: "Pour flâner et faire du shopping :" },
];

function answer(q) {
  const n = norm(q);
  const direct = PLACES.filter((p) => n.includes(norm(p.name)) || norm(p.name).split(" ").some((w) => w.length > 5 && n.includes(w)));
  if (direct.length) return { text: "Voici ce que j'ai trouvé :", places: direct };
  if (/(sortie|evenement|ce soir|week|agenda|concert)/.test(n)) {
    const next = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    return { text: "Prochains rendez-vous : " + next.map((e) => `${e.title} (${fmtDay(new Date(e.date))})`).join(" · "), places: next.map((e) => placeById[e.place]) };
  }
  if (/(bon plan|promo|reduction|offre)/.test(n)) {
    return { text: "Les bons plans du moment : " + DEALS.map((d) => `${d.offer} chez ${d.shop}`).join(" · "), places: DEALS.map((d) => placeById[d.place]) };
  }
  const intent = INTENTS.find((it) => it.keys.some((k) => n.includes(k)));
  if (intent) return { text: intent.say, places: PLACES.filter((p) => p.cat === intent.cat).sort((a, b) => b.rating - a.rating) };
  return { text: "Je n'ai pas encore la réponse 🙂 Essayez « un resto », « un musée », « une balade » ou « ce week-end »." };
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
  const reply = (q) => {
    add(esc(q), "me");
    setTimeout(() => {
      const r = answer(q);
      add(esc(r.text) + (r.places ? "<br>" + r.places.map((p) => `<button class="place-link" data-place="${p.id}">${CATEGORIES[p.cat].icon} ${esc(p.name)}</button>`).join("") : ""), "bot");
    }, 350);
  };

  add(`Bonjour ! Je suis le guide de Limoges 🔥<br>Que cherchez-vous aujourd'hui ?
    <div class="suggestions">
      ${["Où manger ?", "Un musée", "Une balade", "Ce week-end", "Bons plans"].map((s) => `<button class="chip" data-suggest="${s}">${s}</button>`).join("")}
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
