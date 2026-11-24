/* CinéDeck — logique de la maquette « Croisette » (vanilla JS, sans dépendance) */
(() => {
  'use strict';
  const { CARDS, PACKS, RARITIES, RARITY_ORDER, TYPES, TYPE_ORDER } = window.CINEDECK;
  const ICONS = Object.assign({}, window.CINEDECK.ICONS, {
    arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    back: '<path d="M20 12H4M10 6l-6 6 6 6"/>'
  });
  const byId = new Map(CARDS.map(c => [c.id, c]));
  const packById = new Map(PACKS.map(p => [p.id, p]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduced() ? 0 : ms));
  const pad = n => String(n).padStart(3, '0');
  const rank = c => RARITIES[c.rarity].rank;
  const plural = (n, s, p) => `${n} ${n > 1 ? (p || s + 's') : s}`;

  /* ───────────── Images (TMDB en direct, ou copies locales pour l'Artifact) ───────────── */
  const IMG_BASE = window.CINEDECK_IMG_BASE || 'https://image.tmdb.org/t/p/';
  const IMG_MAP = window.CINEDECK_IMG_MAP || {};
  const imgUrl = (p, size) => !p ? '' : /^https?:/.test(p) ? (IMG_MAP[p] || p) : IMG_BASE + size + p;
  function cardImage(c) {
    const i = c.img || {};
    if (c.type === 'film') return { src: imgUrl(i.poster, 'w500'), focus: '50% 18%', alt: `Affiche de ${c.name}` };
    if (c.type === 'actor') return { src: imgUrl(i.profile, 'h632'), focus: i.focus || '50% 25%', alt: `Portrait de ${c.name}` };
    return { src: imgUrl(i.still || i.photo, 'w780'), focus: i.focus || '50% 40%', alt: c.name };
  }
  function backdropOf(c) {
    const i = c.img || {};
    if (c.type === 'actor') { const f = c.filmography.map(id => byId.get(id)).find(f => filmKnown(f.id)); return f ? { src: imgUrl(f.img.still, 'w1280'), focus: '50% 30%' } : null; }
    const p = i.still || i.photo;
    return p ? { src: imgUrl(p, 'w1280'), focus: i.focus || '50% 30%' } : null;
  }
  const ACCENT = { scifi: '#2f5d73', animation: '#b8862f', eighties: '#7a2f5b', horror: '#5c0f14', classics: '#3a3631' };

  /* ───────────── État (mémoire + localStorage protégé) ───────────── */
  const KEY = 'cinedeck-demo-v3';
  const START = {
    owned: ['marty', 'biff', 'clocktower', 'power', 'johnny', 'mjfox', 'teenwolf', 'primer', 'moon', 'planete'],
    discovered: [], playlist: ['power', 'johnny'], playlistName: 'Ma bande originale', coins: 1250, attempts: {}, featured: 'scifi'
  };
  const fresh = () => JSON.parse(JSON.stringify(START));
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.owned)) return Object.assign(fresh(), s); } catch (e) { /* stockage indisponible */ }
    return fresh();
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ } }
  const isOwned = id => state.owned.includes(id);
  const isDiscovered = id => state.discovered.includes(id);
  const filmKnown = id => isOwned(id) || isDiscovered(id);
  function cardState(c) {
    if (isOwned(c.id)) return 'owned';
    if (c.type === 'film' && isDiscovered(c.id)) return 'discovered';
    return 'unknown';
  }
  function setOwned(id, on) {
    const has = isOwned(id);
    if (on && !has) state.owned.push(id);
    if (!on && has) state.owned = state.owned.filter(x => x !== id);
    if (!on) state.playlist = state.playlist.filter(x => x !== id);
  }
  const CATS = [[0, 'Spectateur'], [900, 'Habitué'], [1500, 'Cinéphile'], [2400, 'Critique'], [3600, 'Cinéaste']];
  function standing() {
    const pts = state.owned.length * 100 + state.discovered.length * 60;
    const i = CATS.findLastIndex(([min]) => pts >= min);
    const next = CATS[i + 1];
    return { pts, title: CATS[i][1], next: next && next[1], need: next ? next[0] - pts : 0, pct: next ? Math.round((pts - CATS[i][0]) / (next[0] - CATS[i][0]) * 100) : 100 };
  }

  /* ───────────── Rendu d'une carte ───────────── */
  function laurel() {
    const leaves = [];
    for (let k = 0; k < 6; k++) {
      const a = (112 + k * 24) * Math.PI / 180;
      const x = 50 + 40 * Math.cos(a), y = 50 + 40 * Math.sin(a), rot = (112 + k * 24) + 70;
      leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="2.6" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
      const x2 = 100 - x;
      leaves.push(`<ellipse cx="${x2.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="2.6" transform="rotate(${180 - rot} ${x2.toFixed(1)} ${y.toFixed(1)})"/>`);
    }
    return `<svg class="laurel" viewBox="0 0 100 100" aria-hidden="true">${leaves.join('')}</svg>`;
  }
  function cardSub(c) {
    switch (c.type) {
      case 'film': return `${c.year} · ${c.director}`;
      case 'character': return byId.get(c.film).name;
      case 'location': return filmKnown(c.film) ? byId.get(c.film).name : 'Film à identifier';
      case 'music': return c.artist;
      case 'actor': return `Né en ${c.born.match(/\d{4}/)[0]}`;
    }
    return '';
  }
  /** opts: state, tag ('button'|'div'), cls, hint, isNew, eager */
  function cardHTML(c, opts = {}) {
    const st = opts.state || cardState(c);
    const tag = opts.tag || 'button';
    const attrs = `data-id="${c.id}" ${tag === 'button' ? 'type="button"' : ''}`;
    const T = TYPES[c.type].label;
    if (st === 'unknown') {
      return `<${tag} class="card is-unknown t-${c.type} ${opts.cls || ''}" ${attrs} aria-label="${T} non obtenu">
        <span class="c-rule"></span><span class="c-img"><span class="c-q">?</span></span>
        <span class="c-cap"><span class="c-type">${T}</span><span class="c-title">À découvrir</span>${opts.hint ? `<span class="c-sub">${esc(opts.hint)}</span>` : ''}<span class="c-meta"><span>Non obtenu</span></span></span>
      </${tag}>`;
    }
    const R = RARITIES[c.rarity];
    const im = cardImage(c);
    return `<${tag} class="card r-${c.rarity} t-${c.type} ${st === 'discovered' ? 'is-discovered' : ''} ${opts.cls || ''}" ${attrs} style="--focus:${im.focus}" aria-label="${esc(c.name)}, ${T}, ${R.label}${st === 'discovered' ? ', découvert' : ''}">
      <span class="c-img"><img src="${im.src}" alt="${esc(im.alt)}" ${opts.eager ? '' : 'loading="lazy"'} decoding="async"></span>
      <span class="c-rule"></span><span class="c-corners"></span>
      ${st === 'discovered' ? '<span class="c-flag">Découvert</span>' : ''}
      <span class="c-seal" title="${R.label}">${c.rarity === 'legendary' ? laurel() : ''}<b>${R.numeral}</b></span>
      <span class="c-cap">
        <span class="c-type">${T}</span>
        <span class="c-title">${esc(c.name)}</span>
        <span class="c-sub">${esc(cardSub(c))}</span>
        <span class="c-meta"><span>N° ${pad(c.no)}</span><b>${R.label}</b></span>
      </span>
      <span class="c-glow"></span><span class="c-sheen"></span>
      ${opts.isNew ? '<span class="c-new">Nouveau</span>' : ''}
    </${tag}>`;
  }
  const cardBack = () => `<span class="card-back"><span class="cb-mono">Cd</span><span class="cb-name">CinéDeck</span></span>`;
  function canHTML(p, cls = '') {
    return `<span class="can ${cls}" style="--p-accent:${ACCENT[p.id] || 'var(--rouge)'}">
      <span class="can-shadow"></span><span class="can-inside"></span>
      <span class="can-lid"><span class="can-label">
        <span class="l-brand">CinéDeck</span><span class="l-band"></span>
        <span class="l-name">${esc(p.name)}</span><span class="l-ed">${esc(p.edition)}</span><span class="l-spec">35 mm · 5 cartes</span>
      </span></span>
    </span>`;
  }

  /* ───────────── Navigation ───────────── */
  const ROUTES = [
    { id: 'packs', label: 'Programme', tab: 'Programme', icon: 'reel' },
    { id: 'collection', label: 'Collection', tab: 'Collection', icon: 'grid' },
    { id: 'playlist', label: 'Bande originale', tab: 'B.O.', icon: 'music' },
    { id: 'profil', label: 'Accréditation', tab: 'Profil', icon: 'user' }
  ];
  const route = () => { const h = location.hash.slice(1); return ROUTES.some(r => r.id === h) ? h : 'packs'; };
  function renderChrome() {
    const cur = route();
    $('#topnav').innerHTML = ROUTES.map(r => `<a href="#${r.id}" ${r.id === cur ? 'aria-current="page"' : ''}>${r.label}</a>`).join('');
    $('#tabbar').innerHTML = ROUTES.map(r => `<a href="#${r.id}" ${r.id === cur ? 'aria-current="page"' : ''}>${icon(r.icon)}<span>${r.tab}</span></a>`).join('')
      + `<button type="button" id="demo-open-tab" data-demo-open>${icon('sliders')}<span>Démo</span></button>`;
    $('#purse').innerHTML = `<span><b>${state.coins.toLocaleString('fr-FR')}</b>bobines</span><button class="link-btn add" type="button" data-demo="coins">+ 500</button><button class="link-btn add" type="button" data-demo-open>Mode démo</button>`;
  }
  function render() {
    renderChrome();
    const r = route();
    const v = $('#view');
    v.classList.toggle('under-head', r === 'packs');
    v.innerHTML = r === 'collection' ? viewCollection() : r === 'playlist' ? viewPlaylist() : r === 'profil' ? viewProfile() : viewPacks();
    renderCapsule();
  }
  const CREDITS = `Affiches, photos de plateau et portraits : <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">The Movie Database (TMDB)</a>. Cette maquette utilise des images de TMDB mais n'est ni approuvée ni certifiée par TMDB. Photo de Puente Hills Mall : Mark Yasuda, <a href="https://commons.wikimedia.org/wiki/File:2019_Puente_Hills_Mall.jpg" target="_blank" rel="noopener">CC BY-SA 4.0, via Wikimedia Commons</a>. Notes, critiques et disponibilités : données d'exemple.`;

  /* ───────────── Programme ───────────── */
  function viewPacks() {
    const f = packById.get(state.featured) || PACKS[0];
    const films = f.pool.filter(id => byId.get(id).type === 'film').length;
    return `
      <section class="premiere" aria-label="Sélection à l'affiche">
        <img class="premiere-bg" src="${imgUrl(f.still, 'w1280')}" alt="">
        <div class="premiere-inner">
          <div class="premiere-text">
            <span class="kicker">Sélection officielle · Saison 1</span>
            <h1>${esc(f.name)}</h1>
            <p class="ed">${esc(f.edition)}</p>
            <p class="desc">${esc(f.desc)}</p>
            <dl class="facts-line">
              <div><dt>Cartes</dt><dd>${f.pool.length}</dd></div>
              <div><dt>Films</dt><dd>${films}</dd></div>
              <div><dt>Par bobine</dt><dd>5 cartes</dd></div>
              <div><dt>Prix</dt><dd>${f.price} bobines</dd></div>
            </dl>
            <div class="premiere-cta"><button class="btn btn-red" type="button" data-open-pack="${f.id}">Ouvrir une bobine</button><a class="link-btn" href="#collection">Voir la collection ${icon('arrow')}</a></div>
            <p class="odds-line">${RARITY_ORDER.map(r => `${RARITIES[r].label} <b>${RARITIES[r].odds}</b>`).join(' · ')}</p>
          </div>
          <div class="premiere-can"><button class="can-btn" type="button" data-open-pack="${f.id}" aria-label="Ouvrir une bobine ${esc(f.name)}">${canHTML(f)}</button></div>
        </div>
      </section>

      <section class="section" aria-label="Le programme">
        <h2 class="sec-title">Le programme <small>${PACKS.length} sélections</small></h2>
        <ul class="lineup">${PACKS.map(p => `<li><button type="button" data-feature="${p.id}" aria-pressed="${p.id === f.id}">
          ${canHTML(p)}
          <span style="display:grid;gap:6px;min-width:0"><span class="h">${esc(p.name)}</span><span class="ed">${esc(p.edition)}</span></span>
          <span class="meta">${p.pool.length} cartes<br>${p.price} bobines</span>
        </button></li>`).join('')}</ul>
      </section>

      <section class="section" aria-label="Séances de démonstration">
        <h2 class="sec-title">Séances de démonstration <small>une mécanique par salle</small></h2>
        <ul class="salles">${[
          ['pack', 'Ouvrir une bobine', 'Le couvercle se dévisse, les cartes sortent une à une.'],
          ['film', 'Retour vers le futur', 'La fiche complète : bande-annonce, critiques, univers du film.'],
          ['location', 'Deviner un lieu', 'Sans la carte du film, à vous de trouver le titre.'],
          ['music', 'Écouter une musique', 'L\'extrait se lance dès que la carte se révèle.'],
          ['actor', 'Michael J. Fox', 'Une filmographie qui se dévoile carte après carte.']
        ].map(([k, t, s], i) => `<li><button type="button" data-tour="${k}"><span class="no">Salle ${i + 1}</span><span style="display:grid;gap:4px;min-width:0"><span class="h">${t}</span><span class="sub">${s}</span></span>${icon('arrow')}</button></li>`).join('')}</ul>
      </section>
      <p class="credits-line">${CREDITS}</p>`;
  }

  /* ───────────── Collection ───────────── */
  const colFilter = { type: 'all', rarity: 'all' };
  function sortCards(list) {
    const order = { owned: 0, discovered: 1, unknown: 2 };
    return list.slice().sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || order[cardState(a)] - order[cardState(b)] || rank(b) - rank(a) || a.no - b.no);
  }
  function viewCollection() {
    const owned = CARDS.filter(c => isOwned(c.id)).length;
    const list = CARDS.filter(c => (colFilter.type === 'all' || c.type === colFilter.type) && (colFilter.rarity === 'all' || c.rarity === colFilter.rarity));
    const types = colFilter.type === 'all' ? TYPE_ORDER : [colFilter.type];
    const sections = types.map(t => {
      const items = sortCards(list.filter(c => c.type === t));
      if (!items.length) return '';
      return `<section class="section"><h2 class="sec-title">${TYPES[t].plural} <small>${items.filter(c => isOwned(c.id)).length} / ${items.length}</small></h2>
        <div class="card-grid">${items.map(c => cardHTML(c)).join('')}</div></section>`;
    }).join('');
    const frames = CARDS.map(c => { const s = cardState(c); return `<i class="fr s-${s} r-${c.rarity}" title="N° ${pad(c.no)} · ${s === 'unknown' ? 'inconnue' : esc(c.name)}"></i>`; }).join('');
    return `
      <section class="section" style="gap:26px">
        <div class="page-head"><span class="kicker">La cinémathèque</span><h1 class="display">Collection</h1>
          <p class="count"><b>${owned}</b> cartes sur ${CARDS.length} · ${plural(state.discovered.length, 'film identifié', 'films identifiés')}</p></div>
        <div class="strip" style="--n:${CARDS.length}" aria-label="${owned} cartes obtenues sur ${CARDS.length}">${frames}</div>
        <div class="legend"><span><i style="background:var(--ivoire)"></i>Obtenue</span><span><i style="background:var(--gilt)"></i>Prestige</span><span><i style="background:var(--rouge-clair)"></i>Légende</span><span><i style="background:#4d4740"></i>Film identifié</span><span><i style="background:#1d1a16;box-shadow:inset 0 0 0 1px var(--line-2)"></i>Inconnue</span></div>
        <div class="filters">
          <div class="filter-row" role="group" aria-label="Type">
            <button type="button" data-ftype="all" aria-pressed="${colFilter.type === 'all'}">Toutes<em>${CARDS.length}</em></button>
            ${TYPE_ORDER.map(t => `<button type="button" data-ftype="${t}" aria-pressed="${colFilter.type === t}">${TYPES[t].plural}<em>${CARDS.filter(c => c.type === t).length}</em></button>`).join('')}
          </div>
          <div class="filter-row" role="group" aria-label="Rareté">
            <button type="button" data-frarity="all" aria-pressed="${colFilter.rarity === 'all'}">Toutes raretés</button>
            ${RARITY_ORDER.map(r => `<button type="button" data-frarity="${r}" aria-pressed="${colFilter.rarity === r}">${RARITIES[r].label}<em>${RARITIES[r].numeral}</em></button>`).join('')}
          </div>
        </div>
      </section>
      ${sections || '<p class="it muted">Aucune carte pour ce filtre.</p>'}`;
  }

  /* ───────────── Bande originale ───────────── */
  const filmLabelFor = c => filmKnown(c.film) ? byId.get(c.film).name : 'film à identifier';
  function viewPlaylist() {
    const tracks = state.playlist.map(id => byId.get(id)).filter(Boolean);
    const ownedNotIn = CARDS.filter(c => c.type === 'music' && isOwned(c.id) && !state.playlist.includes(c.id));
    const locked = CARDS.filter(c => c.type === 'music' && !isOwned(c.id)).length;
    const row = (c, n, inList) => {
      const on = player.current === c.id && player.playing;
      return `<li class="track ${player.current === c.id ? 'is-current' : ''}">
        <span class="n">${on ? '<span class="eq"><i></i><i></i><i></i></span>' : n}</span>
        <span class="th"><img src="${imgUrl(c.img.still, 'w300')}" alt="" loading="lazy"></span>
        <span class="t"><b>${esc(c.name)}</b><span>${esc(c.artist)} — ${esc(filmLabelFor(c))}</span></span>
        <span class="acts">
          <button class="circle-btn" type="button" data-play="${c.id}" aria-label="${on ? 'Arrêter' : 'Écouter'} ${esc(c.name)}">${icon(on ? 'stop' : 'play')}</button>
          ${inList ? `<button class="circle-btn" type="button" data-pl-remove="${c.id}" aria-label="Retirer de la bande originale">${icon('close')}</button>`
                   : `<button class="circle-btn" type="button" data-pl-add="${c.id}" aria-label="Ajouter à la bande originale">${icon('plus')}</button>`}
        </span>
      </li>`;
    };
    return `
      <section class="bo-head">
        <div class="sleeve-wrap ${player.playing ? 'playing' : ''}"><span class="sleeve-disc"></span><span class="sleeve"><span>CinéDeck</span><b>Bande<br>originale</b><span>${plural(tracks.length, 'titre')}</span></span></div>
        <div style="display:grid;gap:16px;min-width:0">
          <span class="kicker">Musiques obtenues</span>
          <label class="sr-only" for="pl-name">Nom de la playlist</label>
          <input class="bo-title" id="pl-name" value="${esc(state.playlistName)}" maxlength="40">
          <p class="it muted" style="font-size:1.1rem">Extraits de douze secondes, joués dans l'ordre de la liste.</p>
          <div><button class="btn btn-ivory" type="button" data-pl-playall ${tracks.length ? '' : 'disabled'}>${icon('play')}Tout écouter</button></div>
        </div>
      </section>
      <section class="section"><h2 class="sec-title">La sélection <small>${plural(tracks.length, 'titre')}</small></h2>
        ${tracks.length ? `<ol class="tracks">${tracks.map((c, i) => row(c, i + 1, true)).join('')}</ol>` : '<p class="it muted">Ajoutez des musiques obtenues pour composer votre bande originale.</p>'}</section>
      ${ownedNotIn.length ? `<section class="section"><h2 class="sec-title">À ajouter</h2><ul class="tracks">${ownedNotIn.map(c => row(c, '+', false)).join('')}</ul></section>` : ''}
      <section class="section"><h2 class="sec-title">Encore à trouver <small>${locked}</small></h2>
        <ul class="tracks">${Array.from({ length: locked }, () => `<li class="track locked"><span class="n">·</span><span class="th">?</span><span class="t"><b>Musique non obtenue</b><span>À trouver dans une bobine</span></span><span></span></li>`).join('') || '<li class="it muted">Toutes les musiques sont obtenues.</li>'}</ul></section>`;
  }

  /* ───────────── Accréditation ───────────── */
  const LADDER = { common: 'primer', uncommon: 'moon', rare: 'planete', epic: 'lucioles', legendary: 'interstellar', mythic: 'mjfox' };
  function viewProfile() {
    const owned = state.owned.map(id => byId.get(id)).filter(Boolean);
    const s = standing();
    const demoFilm = byId.get('bttf');
    return `
      <section class="accr">
        <div class="badge">
          <div class="badge-top"><span>CinéDeck · Saison 1</span><b>Accréditation</b></div>
          <div class="badge-body"><span class="badge-photo">T</span><h1>Théo</h1><p class="cat">${s.title}</p><span class="role">Presse cinéphile · Toutes salles</span></div>
          <div class="badge-foot"><span>N° 0042-1985<br>Valable toute la saison</span><span class="barcode" aria-hidden="true"></span></div>
        </div>
        <div style="display:grid;gap:26px;min-width:0">
          <span class="kicker">Mon parcours</span>
          <h2 style="font-size:clamp(2.2rem,6vw,3.6rem)">${s.title}</h2>
          <dl class="stats">
            <div><dt>Cartes sur ${CARDS.length}</dt><dd>${owned.length}</dd></div>
            ${TYPE_ORDER.map(t => `<div><dt>${TYPES[t].plural}</dt><dd>${owned.filter(c => c.type === t).length}</dd></div>`).join('')}
            <div><dt>Films identifiés</dt><dd>${state.discovered.length}</dd></div>
          </dl>
          ${s.next ? `<div class="next-cat"><span class="fine">Encore ${s.need} points avant la catégorie « ${s.next} »</span><i><em style="width:${s.pct}%"></em></i></div>` : ''}
        </div>
      </section>
      <section class="section"><h2 class="sec-title">Les six raretés <small>de la Séance à la Légende</small></h2>
        <div class="ladder">${RARITY_ORDER.map(r => `<figure>${cardHTML(byId.get(LADDER[r]), { state: 'owned', tag: 'div' })}<figcaption><b>${RARITIES[r].label}</b><em>${RARITIES[r].numeral} · ${RARITIES[r].odds}</em><span>${RARITIES[r].desc}</span></figcaption></figure>`).join('')}</div></section>
      <section class="section"><h2 class="sec-title">Les trois états d'une carte</h2>
        <div class="states">
          <figure>${cardHTML(demoFilm, { state: 'unknown', tag: 'div' })}<figcaption><b>Inconnue</b>Noire : rien ne laisse deviner ce qu'elle cache.</figcaption></figure>
          <figure>${cardHTML(demoFilm, { state: 'discovered', tag: 'div' })}<figcaption><b>Découverte</b>Éteinte : film identifié grâce à un lieu ou une musique.</figcaption></figure>
          <figure>${cardHTML(demoFilm, { state: 'owned', tag: 'div' })}<figcaption><b>Obtenue</b>En lumière, fiche complète débloquée.</figcaption></figure>
        </div></section>
      <section class="section"><h2 class="sec-title">Crédits</h2><p class="credits-line">${CREDITS}</p></section>`;
  }

  /* ───────────── Fiche détaillée ───────────── */
  let sheetStack = [];
  const sheet = $('#sheet');
  function openCard(id, srcEl) {
    const c = byId.get(id);
    if (!c) return;
    if (cardState(c) === 'unknown') { lockedFeedback(c, srcEl); return; }
    sheetStack = [id];
    renderSheet();
    sheet.hidden = false;
    sheet.classList.remove('closing');
    document.body.classList.add('no-scroll');
    sheet.scrollTop = 0;
    flyIn(srcEl);
    afterSheetRender(c, true);
    $('[data-close]', sheet).focus({ preventScroll: true });
  }
  function pushCard(id, srcEl) {
    const c = byId.get(id);
    if (cardState(c) === 'unknown') { lockedFeedback(c, srcEl); return; }
    sheetStack.push(id);
    renderSheet();
    sheet.scrollTop = 0;
    const hero = $('.hero-card', sheet);
    if (hero && !reduced()) hero.animate([{ opacity: 0, transform: 'perspective(1000px) rotateY(-30deg) translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' });
    afterSheetRender(c, true);
  }
  function popCard() {
    sheetStack.pop();
    if (!sheetStack.length) return closeSheet();
    renderSheet();
    afterSheetRender(byId.get(sheetStack.at(-1)), false);
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.add('closing');
    setTimeout(() => { sheet.hidden = true; sheet.innerHTML = ''; sheet.classList.remove('closing'); document.body.classList.remove('no-scroll'); render(); }, 230);
    sheetStack = [];
  }
  function lockedFeedback(c, el) {
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    toast(`${TYPES[c.type].label} pas encore obtenu. À trouver dans la sélection ${c.packs.map(p => packById.get(p).name).join(' ou ')}.`);
  }
  function flyIn(srcEl) {
    const hero = $('.hero-card', sheet);
    if (!srcEl || !hero || reduced() || !srcEl.isConnected) return;
    const from = srcEl.getBoundingClientRect(), to = hero.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const clone = srcEl.cloneNode(true);
    clone.classList.remove('shake', 'is-tilting');
    clone.style.cssText += `;position:fixed;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;margin:0;z-index:80;pointer-events:none;transition:none`;
    document.body.appendChild(clone);
    hero.style.visibility = 'hidden';
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2), dy = (to.top + to.height / 2) - (from.top + from.height / 2), s = to.width / from.width;
    const anim = clone.animate([
      { transform: 'perspective(1400px) translate(0,0) scale(1) rotateY(0)' },
      { transform: `perspective(1400px) translate(${dx}px, ${dy}px) scale(${s}) rotateY(360deg)` }
    ], { duration: 1000, easing: 'cubic-bezier(.3,.7,.2,1)' });
    const done = () => { clone.remove(); hero.style.visibility = ''; };
    anim.onfinish = done; anim.oncancel = done;
  }
  function renderSheet() {
    const c = byId.get(sheetStack.at(-1));
    const st = cardState(c);
    const R = RARITIES[c.rarity];
    const bd = backdropOf(c);
    const body = { film: filmBody, character: characterBody, location: locationBody, music: musicBody, actor: actorBody }[c.type](c, st);
    sheet.innerHTML = `
      ${bd ? `<div class="sh-backdrop ${st === 'discovered' ? 'grey' : ''}" style="--focus:${bd.focus}"><img src="${bd.src}" alt=""></div>` : ''}
      <div class="sheet-panel">
        <div class="sheet-bar">
          ${sheetStack.length > 1 ? `<button class="link-btn" type="button" data-back>${icon('back')}Retour</button>` : '<span></span>'}
          <button class="link-btn" type="button" data-close>Fermer ${icon('close')}</button>
        </div>
        <div class="sheet-layout">
          <div class="sh-hero">${cardHTML(c, { tag: 'div', cls: 'hero-card', eager: true })}</div>
          <div class="sh-body">
            <header class="sh-head">
              <span class="kicker">${TYPES[c.type].label} · ${R.label} · N° ${pad(c.no)}${st === 'discovered' ? ' · Découvert' : ''}</span>
              <h2 class="sh-title">${esc(c.name)}</h2>
              ${headExtra(c)}
            </header>
            ${body}
          </div>
        </div>
      </div>`;
  }
  function headExtra(c) {
    if (c.type === 'film') {
      const bits = [`Un film de <b>${esc(c.director)}</b>`];
      if (c.writers) bits.push(`Scénario <b>${esc(c.writers.replace(', ', ' et '))}</b>`);
      if (c.duration) bits.push(`Durée <b>${c.duration}</b>`);
      bits.push(`Sortie <b>${c.year}</b>`);
      if (c.genres) bits.push(c.genres.join(' · '));
      return `${c.original ? `<p class="sh-orig">${esc(c.original)}</p>` : ''}<p class="billing">${bits.join(' — ')}</p>`;
    }
    if (c.type === 'character') return `<p class="sh-orig">${esc(c.fullName || cardSub(c))}${c.actorName ? `, interprété par ${esc(c.actorName)}` : ''}</p>`;
    if (c.type === 'location') return `<p class="sh-orig">${esc(c.place)}</p>`;
    if (c.type === 'music') return `<p class="sh-orig">${esc(c.artist)}, ${c.year}</p>`;
    if (c.type === 'actor') return `<p class="sh-orig">${esc(c.born)}</p>`;
    return '';
  }
  const miniCard = (id, hint) => cardHTML(byId.get(id), { hint });
  const secH = (label, small) => `<h3 class="sec-h">${label}${small ? ` <small>${small}</small>` : ''}</h3>`;

  function filmBody(c, st) {
    if (st === 'discovered') {
      return `<section class="block"><p class="lede dropcap">${esc(c.blurb || 'Film identifié grâce à un lieu ou une musique.')}</p></section>
        <section class="block">${secH('Fiche réservée')}
          <p class="lede" style="font-style:italic">Obtenez la carte dans une bobine ${esc(c.packs.map(p => packById.get(p).name).join(' ou '))} pour débloquer le synopsis, la bande-annonce, les plateformes et les critiques.</p>
          <div><button class="btn btn-red" type="button" data-open-pack="${c.packs[0]}">Ouvrir une bobine ${esc(packById.get(c.packs[0]).name)}</button></div></section>`;
    }
    if (!c.synopsis) {
      return `<section class="block">${secH('Synopsis')}<p class="lede dropcap">${esc(c.blurb)}</p></section>
        <section class="block">${secH('Bande-annonce')}${trailerHTML(c)}</section>
        <p class="fine">Fiche courte dans la maquette. La version finale chargera synopsis, plateformes et critiques depuis TMDB.</p>
        ${actorsOf(c)}`;
    }
    const types = ['character', 'location', 'music', 'actor'];
    const total = types.reduce((n, t) => n + c.universe[t].length, 0);
    const got = types.reduce((n, t) => n + c.universe[t].filter(isOwned).length, 0);
    return `
      <section class="block">${secH('Synopsis')}<p class="lede dropcap">${esc(c.synopsis)}</p></section>
      <section class="block">${secH('Bande-annonce')}${trailerHTML(c)}</section>
      <section class="block">${secH('Où le regarder', 'disponibilités d\'exemple')}
        <ul class="platforms">${c.streaming.map(s => `<li><a href="${c.watch}" target="_blank" rel="noopener"><b>${esc(s.name)}</b><span>${esc(s.kind)}</span>${icon('external')}</a></li>`).join('')}</ul></section>
      <section class="block">${secH('La critique', 'TMDB · exemples')}
        <div class="score"><b>${(c.tmdb.score / 10).toFixed(1).replace('.', ',')}</b><small>/ 10</small><span>Note des membres TMDB<br>${esc(c.tmdb.votes)}</span></div>
        <div class="quotes">${c.tmdb.reviews.map(r => `<blockquote class="quote"><p>« ${esc(r.text)} »</p><footer><b>${esc(r.author)}</b> · ${r.rating}/10</footer></blockquote>`).join('')}</div></section>
      <section class="block">${secH('Univers du film', `${got} cartes révélées sur ${total}`)}
        <div class="universe">${types.map(t => `<div class="uni-group"><div class="uni-head"><span>${TYPES[t].plural}</span><em>${c.universe[t].filter(isOwned).length} sur ${c.universe[t].length}</em></div>
          <div class="mini-grid">${c.universe[t].map(id => miniCard(id)).join('')}</div></div>`).join('')}</div></section>`;
  }
  function trailerHTML(c) {
    const url = c.trailer || `https://www.youtube.com/results?search_query=${encodeURIComponent(c.name + ' ' + c.year + ' bande annonce')}`;
    return `<a class="trailer" href="${url}" target="_blank" rel="noopener" aria-label="Voir la bande-annonce de ${esc(c.name)} sur YouTube">
      <img src="${imgUrl(c.img.still, 'w1280')}" alt="" loading="lazy"><span class="ring">${icon('play')}</span>
      <span class="cap"><span>Bande-annonce</span><span>Sur YouTube</span></span></a>`;
  }
  function actorsOf(film) {
    const actors = CARDS.filter(a => a.type === 'actor' && a.filmography.includes(film.id));
    return actors.length ? `<section class="block">${secH('Avec')}<div class="mini-grid">${actors.map(a => miniCard(a.id)).join('')}</div></section>` : '';
  }
  function characterBody(c) {
    return `
      <section class="block"><p class="lede dropcap">${esc(c.desc)}</p>
        <dl class="dl">${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
      <section class="block">${secH('Au générique')}
        <div class="mini-grid"><figure>${miniCard(c.film)}<figcaption>Film</figcaption></figure>${c.actor ? `<figure>${miniCard(c.actor)}<figcaption>Interprète</figcaption></figure>` : ''}</div></section>`;
  }
  function guessBlock(c) {
    const film = byId.get(c.film);
    if (filmKnown(film.id)) {
      return `<div class="carton" id="found"><div class="card-wrap">${miniCard(film.id)}<span class="stamp">Identifié</span></div>
        <div style="position:relative;display:grid;gap:10px;align-content:center"><span class="kicker">Film identifié</span><h4>${esc(film.name)}</h4>
        <p class="it" style="color:#5d4f42">${isOwned(film.id) ? 'Vous possédez ce film : sa fiche complète est ouverte.' : 'Le film apparaît désormais, éteint, dans votre collection. Obtenez sa carte pour ouvrir sa fiche.'}</p></div></div>`;
    }
    const tries = state.attempts[c.id] || 0;
    const shown = c.hints.slice(0, Math.min(tries, c.hints.length));
    const roman = ['I', 'II', 'III'];
    return `<div class="carton" id="guess">
      ${cardHTML(film, { state: 'unknown', tag: 'div' })}
      <form data-guess="${c.id}" autocomplete="off">
        <span class="kicker">Énigme</span>
        <label for="guess-input">De quel film vient ${c.type === 'music' ? 'cette musique' : 'ce lieu'}&nbsp;?</label>
        <div class="field"><input id="guess-input" name="g" placeholder="Titre du film, en français ou en VO" enterkeyhint="send"><button class="btn btn-red btn-sm" type="submit">Proposer</button></div>
        <p class="msg" aria-live="polite">${tries ? `${plural(tries, 'essai')}. Un indice s'ajoute à chaque erreur.` : 'Sans la carte du film, le titre reste secret.'}</p>
        ${shown.length ? `<ul class="clues">${shown.map((h, i) => `<li><b>Indice ${roman[i]}</b>${esc(h)}</li>`).join('')}</ul>` : ''}
      </form>
    </div>`;
  }
  function locationBody(c) {
    const i = c.img || {};
    return `
      <section class="block"><p class="lede dropcap">${esc(c.desc)}</p>
        <dl class="dl"><div><dt>Lieu de tournage</dt><dd>${esc(c.shooting)}</dd></div><div><dt>Coordonnées</dt><dd>${esc(c.coords)}</dd></div></dl>
        ${i.credit ? `<p class="fine"><a href="${i.creditUrl}" target="_blank" rel="noopener">${esc(i.credit)}</a></p>` : ''}</section>
      <section class="block">${secH('Film associé')}${guessBlock(c)}</section>`;
  }
  function musicBody(c) {
    const on = player.current === c.id && player.playing;
    const inPl = state.playlist.includes(c.id);
    return `
      <section class="listen">
        <button class="circle-btn lg" type="button" data-play="${c.id}" aria-label="${on ? 'Arrêter' : 'Écouter'} l'extrait">${icon(on ? 'stop' : 'play')}</button>
        <div class="listen-meta"><b>${esc(c.name)}</b><span>Extrait de douze secondes · motif de démonstration</span><div class="prog" data-track="${c.id}"><i></i></div></div>
        <div class="actions"><button class="link-btn" type="button" data-pl-toggle="${c.id}">${inPl ? `${icon('check')}Dans la bande originale` : `${icon('plus')}Ajouter à la bande originale`}</button></div>
      </section>
      <p class="fine">L'extrait officiel de trente secondes viendra d'un service de previews (Deezer ou Spotify). Ici, un motif synthétisé le remplace.</p>
      <section class="block"><p class="lede dropcap">${esc(c.desc)}</p>
        <dl class="dl"><div><dt>Artiste</dt><dd>${esc(c.artist)}</dd></div><div><dt>Année</dt><dd>${c.year}</dd></div><div><dt>Rôle dans le film</dt><dd>${esc(c.role)}</dd></div></dl></section>
      <section class="block">${secH('Film associé')}${guessBlock(c)}</section>`;
  }
  function actorBody(c) {
    const films = c.filmography.map(id => byId.get(id)).sort((a, b) => a.year - b.year);
    const revealed = films.filter(f => filmKnown(f.id)).length;
    return `
      <section class="block">${secH('Biographie')}<p class="lede dropcap">${esc(c.bio)}</p></section>
      <section class="block">${secH('Filmographie', `${revealed} films révélés sur ${films.length}`)}
        <ul class="filmo">${films.map(f => { const k = filmKnown(f.id); return `<li><button type="button" class="${k ? '' : 'locked'}" data-filmo="${f.id}">
          <span class="yr">${f.year}</span><span class="th">${k ? `<img src="${imgUrl(f.img.poster, 'w92')}" alt="" loading="lazy">` : '?'}</span>
          <span class="ti">${k ? esc(f.name) : 'Film à découvrir'}</span><span class="ra">${k ? RARITIES[f.rarity].label : ''}</span></button></li>`; }).join('')}</ul>
        <p class="fine">Chaque film se révèle lorsque vous obtenez sa carte.</p></section>
      <section class="block">${secH('Rôles')}<div class="mini-grid">${c.characters.map(id => miniCard(id)).join('')}</div></section>`;
  }
  function afterSheetRender(c, isFresh) {
    if (c.type === 'music' && isFresh && cardState(c) === 'owned' && !(player.current === c.id && player.playing)) playTrack(c.id);
    else loopViz();
  }

  /* ───────────── Inclinaison légère ───────────── */
  let tiltEl = null;
  function resetTilt(el) { el.classList.remove('is-tilting'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }
  document.addEventListener('pointermove', e => {
    const el = e.target.closest ? e.target.closest('.card:not(.is-unknown)') : null;
    if (tiltEl && tiltEl !== el) resetTilt(tiltEl);
    tiltEl = el;
    if (!el || reduced()) return;
    if (e.pointerType === 'touch' && !el.classList.contains('hero-card')) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const max = el.classList.contains('hero-card') ? 9 : 6;
    el.classList.add('is-tilting');
    el.style.setProperty('--rx', ((.5 - y) * max).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((x - .5) * max).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget && tiltEl) { resetTilt(tiltEl); tiltEl = null; } });

  /* ───────────── Devinette ───────────── */
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(le|la|les|l|the|un|une|a)\b/g, ' ').replace(/\s+/g, ' ').trim();
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function isRight(input, film) {
    const n = norm(input);
    if (!n) return false;
    return film.answers.some(a => { const m = norm(a); return n === m || (m.length > 8 && lev(n, m) <= 2); });
  }
  function submitGuess(form) {
    const c = byId.get(form.dataset.guess);
    const film = byId.get(c.film);
    const val = form.g.value;
    if (!val.trim()) { form.g.focus(); return; }
    if (isRight(val, film)) {
      if (!isDiscovered(film.id)) state.discovered.push(film.id);
      save(); renderSheet();
      const f = $('#found', sheet);
      if (f) { f.classList.add('revealing'); f.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
      afterSheetRender(c, false);
      toast(`Bien vu. « ${film.name} » apparaît désormais dans votre collection.`);
    } else {
      state.attempts[c.id] = (state.attempts[c.id] || 0) + 1;
      save(); renderSheet(); afterSheetRender(c, false);
      const g = $('#guess', sheet), msg = $('.msg', g);
      msg.className = 'msg bad';
      msg.textContent = `« ${val.trim()} » n'est pas le bon film. Le titre reste secret.`;
      g.classList.add('shake');
      $('#guess-input', sheet).focus({ preventScroll: true });
    }
  }

  /* ───────────── Audio : extraits synthétisés (placeholders) ───────────── */
  const player = { ctx: null, master: null, bus: null, current: null, playing: false, startedAt: 0, timer: 0, queue: false, raf: 0 };
  const DUR = 12;
  function ensureCtx() {
    if (player.ctx) { if (player.ctx.state === 'suspended') player.ctx.resume(); return player.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = .22; master.connect(ctx.destination);
    Object.assign(player, { ctx, master });
    return ctx;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(ctx, bus, { t, f, d, type, vol, cutoff }) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    const g = ctx.createGain();
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = cutoff; flt.Q.value = 2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(vol * .5, t + d * .5); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(flt); flt.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .05);
  }
  function playTrack(id, { queue = false } = {}) {
    const c = byId.get(id), ctx = ensureCtx();
    if (!ctx || !c || !c.motif) return;
    stopTrack(true);
    const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(player.master);
    const m = c.motif, step = 60 / m.bpm / 2, t0 = ctx.currentTime + .06, steps = Math.floor(DUR / step);
    for (let i = 0; i < steps; i++) {
      const t = t0 + i * step, deg = m.seq[i % m.seq.length];
      if (deg !== null) note(ctx, bus, { t, f: mtof(m.root + deg), d: step * 1.6, type: m.wave, vol: .32, cutoff: m.cutoff });
      if (i % 4 === 0) note(ctx, bus, { t, f: mtof(m.root - 24 + m.bass[Math.floor(i / 4) % m.bass.length]), d: step * 3.6, type: 'sine', vol: .5, cutoff: 600 });
    }
    bus.gain.setValueAtTime(1, t0 + DUR - .6); bus.gain.linearRampToValueAtTime(0, t0 + DUR);
    Object.assign(player, { bus, current: id, playing: true, startedAt: t0, queue });
    clearTimeout(player.timer);
    player.timer = setTimeout(onTrackEnd, DUR * 1000 + 100);
    syncAudioUI(); loopViz();
  }
  function stopTrack(silent) {
    clearTimeout(player.timer);
    if (player.bus) {
      const b = player.bus, ctx = player.ctx;
      b.gain.cancelScheduledValues(ctx.currentTime); b.gain.setValueAtTime(b.gain.value, ctx.currentTime); b.gain.linearRampToValueAtTime(0, ctx.currentTime + .08);
      setTimeout(() => b.disconnect(), 150);
      player.bus = null;
    }
    player.playing = false;
    if (!silent) syncAudioUI();
  }
  function onTrackEnd() {
    const wasQueue = player.queue, cur = player.current;
    stopTrack();
    if (wasQueue) { const i = state.playlist.indexOf(cur); if (i > -1 && i < state.playlist.length - 1) playTrack(state.playlist[i + 1], { queue: true }); }
  }
  function nextTrack() { const l = state.playlist; if (l.length) playTrack(l[(l.indexOf(player.current) + 1) % l.length], { queue: true }); }
  function togglePlay(id, opts) { if (player.current === id && player.playing) stopTrack(); else playTrack(id, opts); }
  function loopViz() {
    cancelAnimationFrame(player.raf);
    const tick = () => {
      const pct = player.playing && player.ctx ? Math.min(100, (player.ctx.currentTime - player.startedAt) / DUR * 100) : 0;
      $$('.prog').forEach(p => { $('i', p).style.width = (p.dataset.track === player.current ? pct : 0) + '%'; });
      const cp = $('.cap-progress'); if (cp) cp.style.width = pct + '%';
      if (player.playing) player.raf = requestAnimationFrame(tick);
    };
    tick();
  }
  function syncAudioUI() {
    renderCapsule();
    $$('[data-play]').forEach(b => { const on = player.playing && b.dataset.play === player.current; b.innerHTML = icon(on ? 'stop' : 'play'); b.setAttribute('aria-label', on ? 'Arrêter' : 'Écouter'); });
    if (route() === 'playlist' && sheet.hidden) { const y = window.scrollY; $('#view').innerHTML = viewPlaylist(); window.scrollTo(0, y); }
  }
  function renderCapsule() {
    const bar = $('#capsule');
    const c = player.current && byId.get(player.current);
    if (!c) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = `<div class="capsule-inner">
      <span class="cap-th"><img src="${imgUrl(c.img.still, 'w300')}" alt=""></span>
      <button class="cap-meta" type="button" data-open="${c.id}"><b>${esc(c.name)}</b><span>${esc(c.artist)} — ${esc(filmLabelFor(c))}</span></button>
      <span class="cap-ctrl"><button class="circle-btn" type="button" data-play="${c.id}" aria-label="${player.playing ? 'Arrêter' : 'Écouter'}">${icon(player.playing ? 'stop' : 'play')}</button><button class="circle-btn" type="button" data-next aria-label="Titre suivant">${icon('next')}</button></span>
      <span class="cap-progress"></span></div>`;
  }

  /* ───────────── Ouverture d'une bobine ───────────── */
  const stage = $('#stage');
  const DEMO_WEIGHTS = { common: 30, uncommon: 25, rare: 20, epic: 14, legendary: 8, mythic: 3 };
  function drawPack(pack) {
    const pool = pack.pool.slice(), out = [];
    const weight = id => DEMO_WEIGHTS[byId.get(id).rarity] * (isOwned(id) ? .5 : 1);
    while (out.length < Math.min(5, pack.pool.length)) {
      let r = Math.random() * pool.reduce((s, id) => s + weight(id), 0);
      const k = pool.findIndex(id => (r -= weight(id)) <= 0);
      out.push(pool.splice(k < 0 ? 0 : k, 1)[0]);
    }
    return out.sort((a, b) => rank(byId.get(a)) - rank(byId.get(b)));
  }
  // Tapis rouge en perspective, poteaux de laiton et cordons de velours
  function decorSVG() {
    const hy = 330, half0 = 62, H = 700;
    const edge = (y, side) => 500 + side * (half0 + (y - hy) * (338 / (H - hy)));
    let posts = '', ropes = '';
    [-1, 1].forEach(side => {
      const pts = [372, 418, 492, 610].map(y => { const s = (y - 300) / 400; return { x: edge(y, side) + side * (14 + 40 * s), y, w: 4 + 12 * s, h: 26 + 150 * s }; });
      pts.forEach(p => { posts += `<rect x="${(p.x - p.w / 2).toFixed(1)}" y="${(p.y - p.h).toFixed(1)}" width="${p.w.toFixed(1)}" height="${p.h.toFixed(1)}" fill="url(#brass)"/><ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${(p.w * 1.6).toFixed(1)}" ry="${(p.w * .45).toFixed(1)}" fill="#8a6f3c"/><circle cx="${p.x.toFixed(1)}" cy="${(p.y - p.h - p.w * .5).toFixed(1)}" r="${(p.w * .75).toFixed(1)}" fill="url(#brass)"/>`; });
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], ya = a.y - a.h * .82, yb = b.y - b.h * .82;
        ropes += `<path d="M${a.x.toFixed(1)} ${ya.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)} ${(Math.max(ya, yb) + 18 + 30 * ((b.y - 300) / 400)).toFixed(1)} ${b.x.toFixed(1)} ${yb.toFixed(1)}" stroke="#7a1520" stroke-width="${(2 + 7 * ((b.y - 300) / 400)).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      }
    });
    return `<svg class="st-decor" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="carpet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a070c"/><stop offset=".5" stop-color="#6e1018"/><stop offset="1" stop-color="#8e1b24"/></linearGradient>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5f30"/><stop offset=".45" stop-color="#f0dcaa"/><stop offset="1" stop-color="#8a6f3c"/></linearGradient>
        <radialGradient id="pool" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffecc8" stop-opacity=".16"/><stop offset="1" stop-color="#ffecc8" stop-opacity="0"/></radialGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070605"/><stop offset="1" stop-color="#14110e"/></linearGradient>
      </defs>
      <rect x="0" y="${hy}" width="1000" height="${H - hy}" fill="url(#floor)"/>
      <polygon points="${500 - half0},${hy} ${500 + half0},${hy} ${500 + half0 + 338},${H} ${500 - half0 - 338},${H}" fill="url(#carpet)"/>
      <ellipse cx="500" cy="420" rx="300" ry="120" fill="url(#pool)"/>
      ${ropes}${posts}
    </svg>`;
  }
  function openPack(packId) {
    const pack = packById.get(packId);
    if (state.coins < pack.price) { toast('Pas assez de bobines. Ajoutez-en depuis le mode démo.'); return; }
    stopTrack();
    if (!sheet.hidden) { sheet.hidden = true; sheet.innerHTML = ''; sheetStack = []; }
    stage.dataset.pack = packId;
    stage.hidden = false;
    document.body.classList.add('no-scroll');
    stage.innerHTML = `
      ${decorSVG()}<div class="st-spot"></div>
      <canvas class="st-fx" id="dustfx"></canvas><div class="st-flashes" id="flashes"></div><div class="st-white"></div>
      <button class="link-btn st-close" type="button" data-stage-close>Fermer ${icon('close')}</button>
      <div class="st-inner" id="st-inner">
        <div class="st-title"><span class="kicker">Sélection ${esc(pack.name)} · ${esc(pack.edition)}</span><h2>Ouvrez la bobine</h2><p>Touchez la boîte pour dévisser le couvercle.</p></div>
        <button class="can-btn st-can" type="button" data-tear="${pack.id}" aria-label="Ouvrir la bobine">${canHTML(pack)}</button>
        <p class="fine">${pack.price} bobines débitées à l'ouverture</p>
      </div>
      <div class="st-leader" hidden></div>`;
    setupFx($('#dustfx', stage));
    $('[data-tear]', stage).focus({ preventScroll: true });
  }
  async function leader() {
    const el = $('.st-leader', stage);
    if (!el || reduced()) return;
    el.hidden = false;
    for (const n of [3, 2, 1]) { el.innerHTML = `<div class="ld"><span class="ld-sweep"></span><span class="ld-rings"></span><b>${n}</b></div>`; await wait(330); }
    el.hidden = true;
  }
  async function tearPack(packId) {
    const pack = packById.get(packId);
    const btn = $('[data-tear]', stage);
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    state.coins -= pack.price;
    const pulls = drawPack(pack), before = new Set(state.owned);
    save(); renderChrome();
    $('.st-title h2', stage).textContent = 'La séance va commencer';
    $('.st-title p', stage).textContent = ' ';
    const can = $('.can', btn);
    can.classList.add('opening');
    setTimeout(() => can.classList.add('open'), reduced() ? 0 : 500);
    await wait(1500);
    await leader();
    if (stage.hidden) return;
    $('#st-inner', stage).innerHTML = `
      <div class="st-title"><span class="kicker">Sélection ${esc(pack.name)}</span><h2>Retournez vos cartes</h2><p>Les plus précieuses se révèlent en dernier.</p></div>
      <div class="pull-row">${pulls.map((id, i) => { const c = byId.get(id); return `<button class="flip r-${c.rarity} ${rank(c) >= 3 ? 'tease' : ''}" type="button" data-flip="${id}" data-new="${!before.has(id)}" style="--i:${i}" aria-label="Retourner la carte ${i + 1}">
        <span class="flip-halo"></span><span class="flip-inner"><span class="face face-back">${cardBack()}</span><span class="face face-front"></span></span></button>`; }).join('')}</div>
      <div class="st-actions"><button class="link-btn" type="button" data-flip-all>Tout révéler</button></div>`;
  }
  function flashes(n) {
    const box = $('#flashes', stage);
    if (!box || reduced()) return;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const b = document.createElement('span');
        b.className = 'bulb';
        const side = Math.random() < .5 ? Math.random() * 22 : 78 + Math.random() * 22;
        b.style.left = side + '%'; b.style.top = (35 + Math.random() * 60) + '%';
        b.style.scale = (.5 + Math.random() * .7).toFixed(2);
        box.appendChild(b); setTimeout(() => b.remove(), 450);
      }, Math.random() * (300 + n * 90));
    }
  }
  function flipCard(btn) {
    const id = btn.dataset.flip;
    if (btn.classList.contains('flipped')) { closeStage(false); setTimeout(() => openCard(id, null), 50); return; }
    const c = byId.get(id), k = rank(c);
    setOwned(id, true); save();
    $('.face-front', btn).innerHTML = cardHTML(c, { tag: 'div', isNew: btn.dataset.new === 'true', eager: true });
    btn.classList.add('flipped');
    btn.setAttribute('aria-label', `${c.name}, ${RARITIES[c.rarity].label}. Ouvrir la fiche`);
    setTimeout(() => {
      if (k >= 3) flashes({ 3: 3, 4: 6, 5: 11, 6: 16 }[k]);
      if (k >= 5) { goldRain(k === 6 ? 160 : 100); const w = $('.st-white', stage); if (w && !reduced()) { w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); } }
    }, reduced() ? 0 : 420);
    if (c.type === 'music') setTimeout(() => playTrack(id), 500);
    if (!$$('.flip:not(.flipped)', stage).length) {
      const n = $$('.flip[data-new="true"]', stage).length;
      $('.st-actions', stage).innerHTML = `
        <p class="st-sum">${n ? `${plural(n, 'nouvelle carte', 'nouvelles cartes')} pour votre collection.` : 'Aucune nouveauté cette fois.'} Touchez une carte pour ouvrir sa fiche.</p>
        <a class="link-btn" href="#collection" data-stage-close>Voir la collection ${icon('arrow')}</a>
        <button class="btn btn-red" type="button" data-open-pack="${stage.dataset.pack}">Ouvrir une autre bobine</button>`;
      renderChrome();
    }
  }
  function closeStage(rerender = true) {
    stage.hidden = true; stage.innerHTML = '';
    fx.parts = []; fx.ctx = null;
    document.body.classList.remove('no-scroll');
    if (rerender) render();
  }
  // Pluie de paillettes d'or (canvas discret)
  const fx = { parts: [], raf: 0, ctx: null };
  function setupFx(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
    fx.ctx = cv.getContext('2d'); fx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.parts = [];
  }
  function goldRain(n) {
    if (reduced() || !fx.ctx) return;
    const w = window.innerWidth;
    for (let i = 0; i < n; i++) fx.parts.push({ x: Math.random() * w, y: -20 - Math.random() * 300, vy: .6 + Math.random() * 1.4, sway: Math.random() * 6.28, r: .6 + Math.random() * 1.8, life: 0, max: 260 + Math.random() * 160, c: ['#f3e3b5', '#c8a96a', '#e8d6a6', '#fff6dc'][i % 4] });
    if (!fx.raf) fx.raf = requestAnimationFrame(stepFx);
  }
  function stepFx() {
    const ctx = fx.ctx;
    if (!ctx) { fx.raf = 0; return; }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    fx.parts = fx.parts.filter(p => p.life < p.max && p.y < window.innerHeight + 20);
    for (const p of fx.parts) {
      p.life++; p.sway += .03; p.y += p.vy; p.x += Math.sin(p.sway) * .5;
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.max - p.life) / 60)) * (.55 + .45 * Math.sin(p.life * .2));
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    fx.raf = fx.parts.length ? requestAnimationFrame(stepFx) : 0;
  }

  /* ───────────── Mode démo ───────────── */
  const demo = $('#demo');
  function renderDemo() {
    const universe = ['bttf', ...['character', 'location', 'music', 'actor'].flatMap(t => byId.get('bttf').universe[t])];
    const others = CARDS.filter(c => !universe.includes(c.id));
    const row = c => `<label><input type="checkbox" data-own="${c.id}" ${isOwned(c.id) ? 'checked' : ''}>${esc(c.name)}<small>${TYPES[c.type].label}<br>${RARITIES[c.rarity].label}</small></label>`;
    demo.innerHTML = `
      <header><div><span class="kicker">Maquette</span><h3>Mode démo</h3></div><button class="link-btn" type="button" data-demo-close>Fermer ${icon('close')}</button></header>
      <p class="fine">Cochez ou décochez des cartes pour voir les trois états (inconnue, découverte, obtenue) sans ouvrir de bobine.</p>
      <fieldset><legend>Univers Retour vers le futur</legend>${universe.map(id => row(byId.get(id))).join('')}
        <label><input type="checkbox" data-disc="bttf" ${isDiscovered('bttf') ? 'checked' : ''}>Film identifié<small>état<br>découverte</small></label></fieldset>
      <fieldset><legend>Autres cartes</legend>${others.map(row).join('')}</fieldset>
      <div class="row">
        <button class="btn btn-sm" type="button" data-demo="all">Tout obtenir</button>
        <button class="btn btn-sm" type="button" data-demo="none">Tout retirer</button>
        <button class="btn btn-sm" type="button" data-demo="coins">+ 500 bobines</button>
        <button class="btn btn-sm btn-red" type="button" data-demo="reset">Réinitialiser</button>
      </div>`;
  }
  function openDemo() { renderDemo(); demo.hidden = false; $('[data-demo-close]', demo).focus(); }
  function closeDemo() { demo.hidden = true; }

  /* ───────────── Séances guidées ───────────── */
  function tour(kind) {
    if (kind === 'pack') { openPack(state.featured); return; }
    if (kind === 'film') { setOwned('bttf', true); save(); render(); openCard('bttf', null); return; }
    if (kind === 'location') {
      setOwned('bttf', false); setOwned('clocktower', true);
      state.discovered = state.discovered.filter(x => x !== 'bttf'); delete state.attempts.clocktower;
      save(); render(); openCard('clocktower', null); return;
    }
    if (kind === 'music') { setOwned('power', true); save(); render(); openCard('power', null); return; }
    if (kind === 'actor') { setOwned('mjfox', true); save(); render(); openCard('mjfox', null); }
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
  }

  /* ───────────── Événements ───────────── */
  document.addEventListener('click', e => {
    const t = e.target, q = s => t.closest(s);
    let el;
    if ((el = q('[data-tour]'))) return tour(el.dataset.tour);
    if ((el = q('[data-feature]'))) {
      state.featured = el.dataset.feature; save(); render();
      const h = $('.premiere'); if (h && !reduced()) h.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      return;
    }
    if ((el = q('[data-open-pack]'))) return openPack(el.dataset.openPack);
    if ((el = q('[data-tear]'))) return tearPack(el.dataset.tear);
    if ((el = q('[data-flip-all]'))) { $$('.flip:not(.flipped)', stage).forEach((b, i) => setTimeout(() => flipCard(b), i * 520)); el.remove(); return; }
    if ((el = q('[data-flip]'))) return flipCard(el);
    if ((el = q('[data-stage-close]'))) { closeStage(); return; }
    if ((el = q('[data-play]'))) { e.preventDefault(); return togglePlay(el.dataset.play, { queue: route() === 'playlist' && sheet.hidden && state.playlist.includes(el.dataset.play) }); }
    if ((el = q('[data-next]'))) return nextTrack();
    if ((el = q('[data-pl-playall]'))) return state.playlist.length && playTrack(state.playlist[0], { queue: true });
    if ((el = q('[data-pl-add]'))) { state.playlist.push(el.dataset.plAdd); save(); return render(); }
    if ((el = q('[data-pl-remove]'))) { state.playlist = state.playlist.filter(x => x !== el.dataset.plRemove); save(); return render(); }
    if ((el = q('[data-pl-toggle]'))) {
      const id = el.dataset.plToggle, inPl = state.playlist.includes(id);
      state.playlist = inPl ? state.playlist.filter(x => x !== id) : [...state.playlist, id];
      save();
      el.innerHTML = inPl ? `${icon('plus')}Ajouter à la bande originale` : `${icon('check')}Dans la bande originale`;
      toast(inPl ? 'Retirée de la bande originale.' : `Ajoutée à « ${state.playlistName} ».`);
      return;
    }
    if ((el = q('[data-filmo]'))) {
      const f = byId.get(el.dataset.filmo);
      return filmKnown(f.id) ? pushCard(f.id, null) : lockedFeedback(f, el);
    }
    if ((el = q('[data-ftype]'))) { colFilter.type = el.dataset.ftype; return render(); }
    if ((el = q('[data-frarity]'))) { colFilter.rarity = el.dataset.frarity; return render(); }
    if ((el = q('[data-close]'))) return closeSheet();
    if ((el = q('[data-back]'))) return popCard();
    if ((el = q('[data-open]'))) return openCard(el.dataset.open, null);
    if ((el = q('[data-demo-open]'))) return openDemo();
    if ((el = q('[data-demo-close]'))) return closeDemo();
    if ((el = q('[data-demo]'))) {
      const k = el.dataset.demo;
      if (k === 'all') CARDS.forEach(c => setOwned(c.id, true));
      if (k === 'none') { CARDS.forEach(c => setOwned(c.id, false)); state.discovered = []; }
      if (k === 'coins') state.coins += 500;
      if (k === 'reset') { stopTrack(); player.current = null; state = fresh(); }
      save(); if (!demo.hidden) renderDemo();
      if (stage.hidden) render(); else renderChrome();
      toast(k === 'reset' ? 'Démo réinitialisée.' : k === 'coins' ? '500 bobines ajoutées.' : 'Collection mise à jour.');
      return;
    }
    if ((el = q('button.card[data-id]'))) {
      if (!sheet.hidden && sheet.contains(el)) return pushCard(el.dataset.id, el);
      return openCard(el.dataset.id, el);
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-own]')) { setOwned(t.dataset.own, t.checked); save(); render(); }
    if (t.matches('[data-disc]')) {
      const id = t.dataset.disc;
      state.discovered = t.checked ? [...new Set([...state.discovered, id])] : state.discovered.filter(x => x !== id);
      save(); render();
    }
    if (t.id === 'pl-name') { state.playlistName = t.value.trim() || 'Ma bande originale'; save(); toast('Bande originale renommée.'); }
  });
  document.addEventListener('submit', e => { const f = e.target.closest('[data-guess]'); if (f) { e.preventDefault(); submitGuess(f); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!demo.hidden) return closeDemo();
    if (!stage.hidden) return closeStage();
    if (!sheet.hidden) return sheetStack.length > 1 ? popCard() : closeSheet();
  });
  window.addEventListener('hashchange', () => { if (!sheet.hidden) closeSheet(); render(); window.scrollTo(0, 0); });

  render();
})();
