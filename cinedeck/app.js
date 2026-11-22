/* CinéDeck — logique de la maquette (vanilla JS, sans dépendance) */
(() => {
  'use strict';
  const { CARDS, PACKS, RARITIES, RARITY_ORDER, TYPES, TYPE_ORDER, ICONS } = window.CINEDECK;
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
  const artVars = c => `--a1:${c.art[0]};--a2:${c.art[1]};--a3:${c.art[2]}`;
  const packVars = p => `--p1:${p.colors[0]};--p2:${p.colors[1]};--p3:${p.colors[2]}`;
  const initials = name => name.split(/\s+/).filter(w => /^[A-ZÀ-Ý]/.test(w)).map(w => w[0]).join('').slice(0, 2);
  const hash = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

  /* ───────────── État (mémoire + localStorage protégé) ───────────── */
  const KEY = 'cinedeck-demo-v2';
  const START = {
    owned: ['marty', 'biff', 'clocktower', 'power', 'johnny', 'mjfox', 'teenwolf', 'primer', 'moon', 'planete'],
    discovered: [],
    playlist: ['power', 'johnny'],
    playlistName: 'Ma B.O. culte',
    coins: 1250,
    attempts: {},
    featured: 'scifi'
  };
  const fresh = () => JSON.parse(JSON.stringify(START));
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.owned)) return Object.assign(fresh(), s);
    } catch (e) { /* stockage indisponible */ }
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
  /* Progression joueur (maquette) */
  const RANKS = [[1, 'Spectateur'], [3, 'Habitué'], [5, 'Cinéphile'], [8, 'Critique'], [12, 'Cinéaste']];
  function progress() {
    const xp = state.owned.length * 100 + state.discovered.length * 60;
    const level = 1 + Math.floor(xp / 300);
    const into = xp % 300;
    const title = RANKS.filter(([l]) => level >= l).pop()[1];
    return { xp, level, into, pct: Math.round(into / 3), title };
  }

  /* ───────────── Rendu d'une carte ───────────── */
  function cardSub(c) {
    switch (c.type) {
      case 'film': return `${c.year} · ${c.director}`;
      case 'character': return byId.get(c.film).name;
      case 'location': return filmKnown(c.film) ? byId.get(c.film).name : 'Film inconnu…';
      case 'music': return c.artist;
      case 'actor': return `Né en ${c.born.match(/\d{4}/)[0]}`;
    }
    return '';
  }
  function artInner(c) {
    switch (c.type) {
      case 'film': return `<span class="stars px"></span><span class="sunglow"></span><span class="bigtxt px">${c.year}</span><span class="sun px"></span><span class="ridge px"></span><span class="floor"></span>`;
      case 'character': return `<span class="halo px"></span><span class="bigtxt px">${esc(initials(c.name))}</span><svg class="sil px" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="38" r="18"/><path d="M10 104c2-27 19-42 40-42s38 15 40 42z"/></svg>`;
      case 'location': return `<span class="stars px"></span><span class="moon px"></span><span class="skyline px"></span><span class="street"></span><span class="coords">${esc(c.coords)}</span>`;
      case 'music': return `<span class="rings px"></span><span class="vinyl-wrap px"><span class="vinyl"></span></span>`;
      case 'actor': return `<span class="beam px"></span><span class="pool"></span><span class="bigtxt px">${esc(initials(c.name))}</span><svg class="ico star px" viewBox="0 0 24 24" aria-hidden="true">${ICONS.actor}</svg>`;
    }
    return '';
  }
  /**
   * opts.state : forcer un état ('owned' | 'discovered' | 'unknown')
   * opts.tag   : 'button' (cliquable) ou 'div' (décoratif)
   */
  function cardHTML(c, opts = {}) {
    const st = opts.state || cardState(c);
    const tag = opts.tag || 'button';
    const attrs = `data-id="${c.id}" ${tag === 'button' ? 'type="button"' : ''}`;
    const extra = opts.cls || '';
    if (st === 'unknown') {
      return `<${tag} class="card is-unknown t-${c.type} ${extra}" ${attrs} aria-label="${TYPES[c.type].label} non obtenu">
        <span class="card-frame"><span class="unk-ico">${icon(c.type)}</span><span class="unk-q">?</span>
        <span class="unk-label">${TYPES[c.type].label}</span>${opts.hint ? `<span class="unk-hint">${esc(opts.hint)}</span>` : ''}</span></${tag}>`;
    }
    const R = RARITIES[c.rarity];
    const playing = c.type === 'music' && player.current === c.id && player.playing ? 'is-playing' : '';
    return `<${tag} class="card r-${c.rarity} t-${c.type} ${st === 'discovered' ? 'is-discovered' : ''} ${playing} ${extra}" ${attrs} style="${artVars(c)}" aria-label="${esc(c.name)}, ${TYPES[c.type].label} ${R.label}${st === 'discovered' ? ', découvert' : ''}">
      <span class="card-frame">
        <span class="card-art art-${c.type}">${artInner(c)}</span>
        <span class="foil"></span>
        <span class="card-shade"></span>
        <span class="card-top"><span class="card-type">${icon(c.type)}${TYPES[c.type].label}</span><span class="gems" title="${R.label}">${'<i></i>'.repeat(R.rank)}</span></span>
        ${st === 'discovered' ? '<span class="stamp">Découvert</span>' : ''}
        <span class="card-info">
          <span class="card-name">${esc(c.name)}</span>
          <span class="card-sub">${esc(cardSub(c))}</span>
          <span class="card-foot"><span>N° ${pad(c.no)}</span><b>${R.label}</b></span>
        </span>
      </span>
      <span class="glare"></span>
      ${opts.isNew ? '<span class="badge-new">Nouveau</span>' : ''}
    </${tag}>`;
  }
  const cardBack = () => `<span class="card-back"><span class="cb-inner"><span class="cb-rays"></span><span class="cb-medal">${icon('reel')}<b>CinéDeck</b></span></span></span>`;

  function packHTML(p, cls = '') {
    return `<span class="pack ${cls}" style="${packVars(p)}">
      <span class="pack-crimp top"></span>
      <span class="pack-body">
        <span class="pack-rays"></span>
        <span class="pack-brand">CinéDeck</span>
        <span class="pack-emblem">${icon(p.emblem)}</span>
        <span class="pack-title"><span class="pack-name">${esc(p.name)}</span><span class="pack-ed">${esc(p.edition)}</span></span>
        <span class="pack-count">5 cartes</span>
      </span>
      <span class="pack-crimp bottom"></span>
      <span class="pack-foil"></span>
      <span class="pack-seam"></span>
    </span>`;
  }

  /* ───────────── Navigation ───────────── */
  const ROUTES = ['packs', 'collection', 'playlist', 'profil'];
  const DOCK = [
    { id: 'collection', label: 'Collection', icon: 'grid' },
    { id: 'playlist', label: 'B.O.', icon: 'music' },
    { id: 'packs', label: 'Boutique', icon: 'packs', main: true },
    { id: 'profil', label: 'Profil', icon: 'user' },
    { demo: true, label: 'Démo', icon: 'sliders' }
  ];
  const route = () => { const h = location.hash.slice(1); return ROUTES.includes(h) ? h : 'packs'; };
  function renderChrome() {
    const cur = route();
    $('#dock').innerHTML = DOCK.map(d => d.demo
      ? `<button class="dock-item" type="button" id="demo-open" aria-haspopup="dialog">${icon(d.icon)}<span>${d.label}</span></button>`
      : `<a class="dock-item ${d.main ? 'dock-main' : ''}" href="#${d.id}" ${d.id === cur ? 'aria-current="page"' : ''}>${d.main ? `<span class="orb">${icon(d.icon)}</span>` : icon(d.icon)}<span>${d.label}</span></a>`).join('');
    const p = progress();
    $('#hud').innerHTML = `
      <div class="lvl" title="Niveau ${p.level} · ${p.pct} % vers le niveau ${p.level + 1}">
        <svg viewBox="0 0 42 42" aria-hidden="true"><circle class="ring-bg" cx="21" cy="21" r="18"/><circle class="ring-fg" cx="21" cy="21" r="18" pathLength="100" stroke-dasharray="${p.pct} 100"/></svg><b>${p.level}</b>
      </div>
      <div class="lvl-meta"><span>${p.title}</span><i><em style="width:${p.pct}%"></em></i></div>
      <div class="coins" title="Bobines (monnaie fictive)"><span class="coin">${icon('reel')}</span><b>${state.coins.toLocaleString('fr-FR')}</b><button class="coin-add" type="button" data-demo="coins" aria-label="Ajouter 500 bobines">+</button></div>`;
  }
  function render() {
    renderChrome();
    const r = route();
    $('#view').innerHTML = r === 'collection' ? viewCollection() : r === 'playlist' ? viewPlaylist() : r === 'profil' ? viewProfile() : viewPacks();
    renderCapsule();
  }

  /* ───────────── Écran : Boutique ───────────── */
  function viewPacks() {
    const f = packById.get(state.featured) || PACKS[0];
    const counts = TYPE_ORDER.map(t => [t, f.pool.filter(id => byId.get(id).type === t).length]).filter(([, n]) => n);
    const word = `${esc(f.name)} · `.repeat(3);
    return `
      <section class="hero" style="${packVars(f)}" aria-label="Pack à la une">
        <div class="hero-crawl" aria-hidden="true"><span>${word}</span><span>${word}</span></div>
        <div class="hero-grid">
          <div class="hero-zone">
            <button class="hero-pack" type="button" data-open-pack="${f.id}" aria-label="Ouvrir le pack ${esc(f.name)}">${packHTML(f, 'tiltable')}</button>
            <span class="hero-floor"></span>
          </div>
          <div class="hero-info">
            <span class="kicker">Pack à la une · Saison 1</span>
            <h1 class="hero-title">${esc(f.name)}</h1>
            <p class="serif hero-ed">${esc(f.edition)}</p>
            <p class="hero-desc">${esc(f.desc)}</p>
            <div class="hero-tags">${counts.map(([t, n]) => `<span class="tag">${icon(t)}${n} ${TYPES[t].plural}</span>`).join('')}</div>
            <ul class="odds" aria-label="Taux d'apparition">${RARITY_ORDER.map(r => `<li class="r-${r}"><i class="gem"></i>${RARITIES[r].label} <b>${RARITIES[r].odds}</b></li>`).join('')}</ul>
            <div class="hero-cta">
              <button class="btn btn-gold btn-xl" type="button" data-open-pack="${f.id}">Ouvrir le pack <span class="coin" style="width:24px;height:24px">${icon('reel')}</span>${f.price}</button>
              <span class="fine">Taux de la version finale.<br>La démo les augmente.</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section" aria-label="Tous les packs">
        <h2 class="sec-title">Tous les packs</h2>
        <div class="scroller">
          ${PACKS.map(p => `<button class="rail-item" type="button" data-feature="${p.id}" aria-pressed="${p.id === f.id}">${packHTML(p)}<b>${esc(p.name)}</b><span>${p.pool.length} cartes · ${p.price} bobines</span></button>`).join('')}
        </div>
      </section>

      <section class="section" aria-label="Séances de démonstration">
        <h2 class="sec-title">Séances de démo <small>une mécanique par billet</small></h2>
        <div class="scroller">
          ${[
            ['pack', 'packs', 'Ouverture', 'Ouvrir un pack', 'rideau, déchirure, révélation'],
            ['film', 'film', 'Fiche film', 'Retour vers le futur', 'bande-annonce, critiques, univers'],
            ['location', 'location', 'Énigme', 'Deviner un lieu', 'trouve le film caché'],
            ['music', 'music', 'Platine', 'Révéler une musique', 'l\'extrait se lance tout seul'],
            ['actor', 'actor', 'Carrière', 'Michael J. Fox', 'filmographie à débloquer']
          ].map(([k, ic, small, title, sub], i) => `
            <button class="ticket" type="button" data-tour="${k}"><span class="t-stub">${icon(ic)}<small>Salle ${i + 1}</small></span><span class="t-main"><small>${small}</small><b>${title}</b><span>${sub}</span></span></button>`).join('')}
        </div>
      </section>`;
  }

  /* ───────────── Écran : Collection ───────────── */
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
      const got = items.filter(c => isOwned(c.id)).length;
      return `<section class="section"><h2 class="sec-title">${icon(t)}${TYPES[t].plural} <small>${got} / ${items.length}</small></h2>
        <div class="card-grid">${items.map(c => cardHTML(c)).join('')}</div></section>`;
    }).join('');
    const frames = CARDS.map(c => { const s = cardState(c); return `<i class="fr s-${s} r-${c.rarity}" title="N° ${pad(c.no)} · ${s === 'unknown' ? 'inconnue' : esc(c.name)}"></i>`; }).join('');
    return `
      <section class="col-head">
        <span class="kicker">Ma cinémathèque</span>
        <h1 class="mega">Collection <span class="outline">${owned}/${CARDS.length}</span></h1>
        <div class="filmstrip" aria-label="${owned} cartes obtenues sur ${CARDS.length}"><div class="frames" style="--n:${CARDS.length}">${frames}</div></div>
        <div class="strip-legend">
          <span><i style="background:var(--r-legendary)"></i>Obtenue (couleur de rareté)</span>
          <span><i style="background:#5b5562"></i>Film deviné, pas encore obtenu</span>
          <span><i style="background:#1a1720;box-shadow:inset 0 0 0 1px #3a3445"></i>Inconnue</span>
        </div>
      </section>
      <section class="section" style="gap:10px" aria-label="Filtres">
        <div class="tabs" role="group" aria-label="Type">
          <button class="tab" type="button" data-ftype="all" aria-pressed="${colFilter.type === 'all'}">Toutes <em>${CARDS.length}</em></button>
          ${TYPE_ORDER.map(t => `<button class="tab" type="button" data-ftype="${t}" aria-pressed="${colFilter.type === t}">${icon(t)}${TYPES[t].plural} <em>${CARDS.filter(c => c.type === t).length}</em></button>`).join('')}
        </div>
        <div class="gemfilter" role="group" aria-label="Rareté">
          <button class="gembtn" type="button" data-frarity="all" aria-pressed="${colFilter.rarity === 'all'}">Toutes raretés</button>
          ${RARITY_ORDER.map(r => `<button class="gembtn r-${r}" type="button" data-frarity="${r}" aria-pressed="${colFilter.rarity === r}"><i class="gem"></i>${RARITIES[r].label}</button>`).join('')}
        </div>
      </section>
      ${sections || '<p class="muted">Aucune carte pour ce filtre.</p>'}`;
  }

  /* ───────────── Écran : B.O. ───────────── */
  function filmLabelFor(c) { return filmKnown(c.film) ? byId.get(c.film).name : 'Film inconnu…'; }
  function waveHTML(id) {
    let h = hash(id);
    return `<span class="wave" aria-hidden="true">${Array.from({ length: 28 }, () => { h = (h * 1103515245 + 12345) >>> 0; return `<i style="height:${20 + (h % 80)}%"></i>`; }).join('')}</span>`;
  }
  function viewPlaylist() {
    const tracks = state.playlist.map(id => byId.get(id)).filter(Boolean);
    const ownedNotIn = CARDS.filter(c => c.type === 'music' && isOwned(c.id) && !state.playlist.includes(c.id));
    const locked = CARDS.filter(c => c.type === 'music' && !isOwned(c.id)).length;
    const row = (c, n, inList) => {
      const on = player.current === c.id && player.playing;
      return `<li class="track ${player.current === c.id ? 'is-current' : ''}" style="${artVars(c)}">
        <span class="n">${on ? '<span class="eq"><i></i><i></i><i></i></span>' : n}</span>
        <span class="thumb"><span class="vinyl ${on ? 'spin' : ''}"></span></span>
        <span class="t"><b>${esc(c.name)}</b><span>${esc(c.artist)} — ${esc(filmLabelFor(c))}</span></span>
        ${waveHTML(c.id)}
        <span class="acts">
          <button class="icon-btn" type="button" data-play="${c.id}" aria-label="${on ? 'Arrêter' : 'Écouter'} ${esc(c.name)}">${icon(on ? 'stop' : 'play')}</button>
          ${inList
            ? `<button class="icon-btn" type="button" data-pl-remove="${c.id}" aria-label="Retirer de la playlist">${icon('close')}</button>`
            : `<button class="icon-btn" type="button" data-pl-add="${c.id}" aria-label="Ajouter à la playlist">${icon('plus')}</button>`}
        </span>
      </li>`;
    };
    return `
      <section class="bo-head">
        <div class="sleeve-wrap ${player.playing ? 'playing' : ''}">
          <span class="sleeve-vinyl"><span class="vinyl ${player.playing ? 'spin' : ''}"></span></span>
          <span class="sleeve"><b>B.O.</b><span>${tracks.length} titre${tracks.length > 1 ? 's' : ''} choisis</span></span>
        </div>
        <div style="display:grid;gap:12px;min-width:0">
          <span class="kicker">Bande originale · musiques obtenues</span>
          <label class="sr-only" for="pl-name">Nom de la playlist</label>
          <input class="bo-title" id="pl-name" value="${esc(state.playlistName)}" maxlength="40">
          <p class="serif" style="font-size:1.15rem;color:var(--ink-2)">Extraits de 12 secondes, dans l'ordre de la playlist</p>
          <div><button class="btn btn-gold" type="button" data-pl-playall ${tracks.length ? '' : 'disabled'}>${icon('play')}Tout écouter</button></div>
        </div>
      </section>
      <section class="section">
        <h2 class="sec-title">${icon('music')}Dans la playlist <small>${tracks.length}</small></h2>
        ${tracks.length ? `<ol class="tracks">${tracks.map((c, i) => row(c, i + 1, true)).join('')}</ol>` : '<p class="muted">Ajoute des musiques obtenues pour composer ta bande originale.</p>'}
      </section>
      ${ownedNotIn.length ? `<section class="section"><h2 class="sec-title">${icon('plus')}À ajouter</h2><ul class="tracks">${ownedNotIn.map(c => row(c, '+', false)).join('')}</ul></section>` : ''}
      <section class="section">
        <h2 class="sec-title">${icon('lock')}Encore à trouver <small>${locked}</small></h2>
        <ul class="tracks">${Array.from({ length: locked }, () => `<li class="track locked"><span class="n">·</span><span class="thumb">${icon('lock')}</span><span class="t"><b>Musique non obtenue</b><span>Trouve-la dans un pack pour l'écouter</span></span><span></span></li>`).join('') || '<li class="fine">Toutes les musiques sont obtenues.</li>'}</ul>
      </section>`;
  }

  /* ───────────── Écran : Profil ───────────── */
  const SAMPLE_ART = { common: ['#6c757d', '#1b1b1f', '#c5c6c7'], uncommon: ['#2d6a4f', '#081c15', '#95d5b2'], rare: ['#1d4ed8', '#0b1430', '#93c5fd'], epic: ['#7b2cbf', '#10002b', '#e0aaff'], legendary: ['#c98a12', '#2b1a03', '#ffe08a'], mythic: ['#ff4fa3', '#1a0b2e', '#4ee3c1'] };
  const SAMPLE = r => ({ id: 'sample-' + r, type: 'film', rarity: r, name: RARITIES[r].label, year: RARITIES[r].odds.replace(' ', ''), director: 'Exemple', no: RARITIES[r].rank, art: SAMPLE_ART[r] });
  function viewProfile() {
    const owned = state.owned.map(id => byId.get(id)).filter(Boolean);
    const p = progress();
    const demoFilm = byId.get('bttf');
    return `
      <section class="pass">
        <div class="pass-top"><span class="kicker">Carte de membre · Cinémathèque</span><span>N° 0042-1985</span></div>
        <div class="pass-main">
          <div class="avatar"><svg viewBox="0 0 96 96" aria-hidden="true"><circle class="ring-bg" cx="48" cy="48" r="44"/><circle class="ring-fg" cx="48" cy="48" r="44" pathLength="100" stroke-dasharray="${p.pct} 100"/></svg><b>T</b><em>NIV. ${p.level}</em></div>
          <div style="min-width:0">
            <h1>Théo</h1>
            <p class="serif">${p.title} · niveau ${p.level}</p>
            <div class="xp"><i style="width:${p.pct}%"></i></div>
            <p class="fine" style="margin-top:6px;color:rgba(255,240,189,.6)">${p.into} / 300 XP avant le niveau ${p.level + 1}</p>
          </div>
        </div>
        <div class="pass-stats">
          <div><b>${owned.length}</b><span>cartes / ${CARDS.length}</span></div>
          ${TYPE_ORDER.map(t => `<div><b>${owned.filter(c => c.type === t).length}</b><span>${TYPES[t].plural}</span></div>`).join('')}
          <div><b>${state.discovered.length}</b><span>Films devinés</span></div>
        </div>
      </section>
      <section class="section">
        <h2 class="sec-title">Hiérarchie des raretés <small>du plus courant au plus rare</small></h2>
        <div class="stairs">${RARITY_ORDER.map((r, i) => `<div class="stair r-${r}" style="--i:${i}">${cardHTML(SAMPLE(r), { state: 'owned', tag: 'div' })}<div class="step"><b>${RARITIES[r].label}<small>${RARITIES[r].odds}</small></b><span>${RARITIES[r].desc}</span></div></div>`).join('')}</div>
      </section>
      <section class="section">
        <h2 class="sec-title">Les trois états d'une carte</h2>
        <div class="states">
          <figure>${cardHTML(demoFilm, { state: 'unknown', tag: 'div' })}<figcaption><b>Inconnue</b>Noire : impossible de savoir ce qui se cache dessous.</figcaption></figure>
          <figure>${cardHTML(demoFilm, { state: 'discovered', tag: 'div' })}<figcaption><b>Découverte</b>Grisée : film deviné grâce à un lieu ou une musique.</figcaption></figure>
          <figure>${cardHTML(demoFilm, { state: 'owned', tag: 'div' })}<figcaption><b>Obtenue</b>En couleurs, fiche complète débloquée.</figcaption></figure>
        </div>
      </section>`;
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
    $('.sheet-bar [data-close]', sheet).focus({ preventScroll: true });
  }
  function pushCard(id, srcEl) {
    const c = byId.get(id);
    if (cardState(c) === 'unknown') { lockedFeedback(c, srcEl); return; }
    sheetStack.push(id);
    renderSheet();
    sheet.scrollTop = 0;
    const hero = $('.hero-card', sheet);
    if (hero && !reduced()) hero.animate([{ transform: 'perspective(900px) rotateY(-100deg) scale(.85)' }, { transform: 'perspective(900px) rotateY(0) scale(1)' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
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
    setTimeout(() => { sheet.hidden = true; sheet.innerHTML = ''; sheet.classList.remove('closing'); document.body.classList.remove('no-scroll'); render(); }, 200);
    sheetStack = [];
  }
  function lockedFeedback(c, el) {
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    toast(`${TYPES[c.type].label} pas encore obtenu. À trouver dans : ${c.packs.map(p => packById.get(p).name).join(', ')}.`);
  }
  function flyIn(srcEl) {
    const hero = $('.hero-card', sheet);
    if (!srcEl || !hero || reduced() || !srcEl.isConnected) return;
    const from = srcEl.getBoundingClientRect();
    const to = hero.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const clone = srcEl.cloneNode(true);
    clone.classList.remove('shake', 'is-tilting');
    clone.style.cssText += `;position:fixed;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;margin:0;z-index:80;pointer-events:none;transition:none`;
    document.body.appendChild(clone);
    hero.style.visibility = 'hidden';
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    const s = to.width / from.width;
    const anim = clone.animate([
      { transform: 'perspective(1200px) translate(0,0) scale(1) rotateY(0)' },
      { transform: `perspective(1200px) translate(${dx * .5}px, ${dy * .5 - 60}px) scale(${(1 + s) / 2 * 1.15}) rotateY(180deg)`, offset: .55 },
      { transform: `perspective(1200px) translate(${dx}px, ${dy}px) scale(${s}) rotateY(360deg)` }
    ], { duration: 880, easing: 'cubic-bezier(.25,.75,.25,1)' });
    const done = () => { clone.remove(); hero.style.visibility = ''; };
    anim.onfinish = done; anim.oncancel = done;
  }

  function renderSheet() {
    const c = byId.get(sheetStack.at(-1));
    const st = cardState(c);
    const R = RARITIES[c.rarity];
    sheet.setAttribute('style', artVars(c));
    const body = { film: filmBody, character: characterBody, location: locationBody, music: musicBody, actor: actorBody }[c.type](c, st);
    sheet.innerHTML = `
      <div class="sheet-panel">
        <div class="sheet-bar">
          ${sheetStack.length > 1 ? `<button class="btn btn-glass btn-sm" type="button" data-back>${icon('back')}Retour</button>` : '<span></span>'}
          <button class="icon-btn" type="button" data-close aria-label="Fermer">${icon('close')}</button>
        </div>
        <div class="sheet-layout">
          <div class="sh-hero"><span class="sh-spot"></span>${cardHTML(c, { tag: 'div', cls: 'hero-card' })}<span class="hint">Inclinez la carte</span></div>
          <div class="sh-body">
            <header class="sh-head">
              <div class="sh-badges"><span class="rar-badge r-${c.rarity}"><i class="gem"></i>${R.label}</span><span class="tag">${icon(c.type)}${TYPES[c.type].label}</span><span class="tag">N° ${pad(c.no)}</span>${st === 'discovered' ? '<span class="tag warn">Découvert · non obtenu</span>' : ''}</div>
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
      if (c.writers) bits.push(`Scénario <b>${esc(c.writers.replace(', ', ' & '))}</b>`);
      if (c.duration) bits.push(`Durée <b>${c.duration}</b>`);
      bits.push(`Sortie <b>${c.year}</b>`);
      if (c.genres) bits.push(c.genres.join(' / '));
      return `${c.original ? `<p class="serif sh-orig">${esc(c.original)}</p>` : ''}<p class="billing">${bits.join(' · ')}</p>`;
    }
    if (c.type === 'character') return `<p class="serif sh-orig">${esc(c.fullName || 'Personnage')}${c.actorName ? ` — joué par ${esc(c.actorName)}` : ''}</p>`;
    if (c.type === 'location') return `<p class="serif sh-orig">${esc(c.place)}</p>`;
    if (c.type === 'music') return `<p class="serif sh-orig">${esc(c.artist)}, ${c.year}</p>`;
    if (c.type === 'actor') return `<p class="serif sh-orig">${esc(c.born)}</p>`;
    return '';
  }
  const miniCard = (id, hint) => cardHTML(byId.get(id), { hint });
  const secH = (ic, label, small) => `<h3 class="sec-h">${icon(ic)}${label}${small ? ` <small>${small}</small>` : ''}</h3>`;

  function filmBody(c, st) {
    if (st === 'discovered') {
      return `<section class="block"><p class="lede">${esc(c.blurb || 'Tu as identifié ce film grâce à un lieu ou une musique.')}</p></section>
        <section class="block enigma" style="grid-template-columns:1fr">
          <div style="display:grid;gap:10px"><span class="kicker">${icon('lock')} Fiche verrouillée</span>
          <p class="serif" style="font-size:1.5rem;line-height:1.15">Obtiens la carte dans un pack ${esc(c.packs.map(p => packById.get(p).name).join(' ou '))} pour débloquer synopsis, bande-annonce, plateformes et critiques.</p>
          <div><button class="btn btn-gold" type="button" data-open-pack="${c.packs[0]}">Ouvrir un pack ${esc(packById.get(c.packs[0]).name)}</button></div></div>
        </section>`;
    }
    if (!c.synopsis) {
      return `<section class="block">${secH('film', 'Synopsis')}<p class="lede dropcap">${esc(c.blurb)}</p></section>
        <section class="block"><p class="fine">Fiche courte dans la maquette. La version finale chargera synopsis, bande-annonce, plateformes et critiques depuis TMDB.</p></section>
        ${actorsOf(c)}`;
    }
    const types = ['character', 'location', 'music', 'actor'];
    const total = types.reduce((n, t) => n + c.universe[t].length, 0);
    const got = types.reduce((n, t) => n + c.universe[t].filter(isOwned).length, 0);
    const groups = types.map(t => {
      const ids = c.universe[t];
      return `<div class="uni-group"><div class="uni-head"><span>${icon(t)}${TYPES[t].plural}</span><span class="pips">${ids.map(id => `<i class="${isOwned(id) ? 'on' : ''}"></i>`).join('')}</span></div>
        <div class="mini-grid">${ids.map(id => miniCard(id)).join('')}</div></div>`;
    }).join('');
    return `
      <section class="block">${secH('film', 'Synopsis')}<p class="lede dropcap">${esc(c.synopsis)}</p></section>
      <section class="block">${secH('play', 'Bande-annonce')}
        <a class="cinema" href="${c.trailer}" target="_blank" rel="noopener" aria-label="Voir la bande-annonce sur YouTube">
          <span class="cinema-screen"><span class="play">${icon('play')}</span></span>
          <span class="drape l"></span><span class="drape r"></span><span class="valance-mini"></span><span class="seats"></span>
          <span class="cinema-cap"><span>Bande-annonce VF</span><span>S'ouvre sur YouTube</span></span>
        </a></section>
      <section class="block">${secH('ticket', 'Où le regarder', 'exemples')}
        <div class="ptickets">${c.streaming.map(s => `<a class="pticket" href="${c.watch}" target="_blank" rel="noopener"><small>${esc(s.kind)}</small><b>${esc(s.name)}</b>${icon('external')}</a>`).join('')}</div>
        <p class="fine">La version finale lira la disponibilité dans TMDB (watch providers, région France).</p></section>
      <section class="block">${secH('actor', 'Critiques TMDB', 'données d\'exemple')}
        <div class="score">
          <div class="gauge" style="--v:${c.tmdb.score}"><b>${c.tmdb.score}<sup>%</sup></b></div>
          <div class="score-meta"><b>Note des membres TMDB</b><p class="fine">${c.tmdb.votes}</p></div>
        </div>
        <div class="quotes">${c.tmdb.reviews.map(r => `<blockquote class="quote"><p>${esc(r.text)}</p><footer><b>${esc(r.author)}</b><span>${r.rating}/10</span></footer></blockquote>`).join('')}</div></section>
      <section class="block">${secH('grid', 'Univers du film', `${got} / ${total} cartes révélées`)}
        <div class="universe">${groups}</div></section>`;
  }
  function actorsOf(film) {
    const actors = CARDS.filter(a => a.type === 'actor' && a.filmography.includes(film.id));
    if (!actors.length) return '';
    return `<section class="block">${secH('actor', 'Avec')}<div class="mini-grid">${actors.map(a => miniCard(a.id)).join('')}</div></section>`;
  }
  function characterBody(c) {
    return `
      <section class="block"><p class="lede dropcap">${esc(c.desc)}</p>
        <dl class="facts">${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
      <section class="block">${secH('grid', 'Liens')}
        <div class="mini-grid">
          <figure>${miniCard(c.film)}<figcaption>Film</figcaption></figure>
          ${c.actor ? `<figure>${miniCard(c.actor)}<figcaption>Interprète</figcaption></figure>` : ''}
        </div></section>`;
  }
  function guessBlock(c) {
    const film = byId.get(c.film);
    if (filmKnown(film.id)) {
      return `<div class="found" id="found"><div class="card-wrap">${miniCard(film.id)}<span class="found-stamp">Identifié</span></div>
        <div style="display:grid;gap:8px"><span class="kicker">Film trouvé</span><h4>${esc(film.name)}</h4><p class="fine">${isOwned(film.id) ? 'Tu possèdes ce film : sa fiche complète est débloquée.' : 'Le film apparaît désormais en grisé dans ta collection. Obtiens sa carte pour débloquer sa fiche.'}</p></div></div>`;
    }
    const tries = state.attempts[c.id] || 0;
    const shown = c.hints.slice(0, Math.min(tries, c.hints.length));
    return `<div class="enigma" id="guess">
      ${cardHTML(film, { state: 'unknown', tag: 'div' })}
      <form data-guess="${c.id}" autocomplete="off">
        <label for="guess-input">De quel film vient ${c.type === 'music' ? 'cette musique' : 'ce lieu'}&nbsp;?</label>
        <div class="field"><input id="guess-input" name="g" placeholder="Titre du film, en français ou en VO" enterkeyhint="send"><button class="btn btn-gold" type="submit">Proposer</button></div>
        <p class="msg" aria-live="polite">${tries ? `${tries} essai${tries > 1 ? 's' : ''} · un indice se débloque à chaque erreur.` : 'Sans la carte du film, le titre reste secret.'}</p>
        ${shown.length ? `<ul class="clues">${shown.map((h, i) => `<li><b>Indice ${i + 1}</b>${esc(h)}</li>`).join('')}</ul>` : ''}
      </form>
    </div>`;
  }
  function locationBody(c) {
    return `
      <section class="block"><p class="lede dropcap">${esc(c.desc)}</p>
        <dl class="facts"><div><dt>Lieu de tournage</dt><dd>${esc(c.shooting)}</dd></div><div><dt>Coordonnées</dt><dd class="mono">${esc(c.coords)}</dd></div></dl></section>
      <section class="block">${secH('film', 'Film associé')}${guessBlock(c)}</section>`;
  }
  function musicBody(c) {
    const on = player.current === c.id && player.playing;
    const inPl = state.playlist.includes(c.id);
    return `
      <section class="deck">
        <div class="plinth">
          <span class="platter"><span class="vinyl ${on ? 'spin' : ''}"></span></span>
          <span class="arm ${on ? 'on' : ''}"><i></i></span>
          <span class="led ${on ? 'on' : ''}"></span>
        </div>
        <div class="deck-side">
          <div class="deck-title"><b>${esc(c.name)}</b><span>Extrait de 12 s · motif de démonstration</span></div>
          <div class="deck-ctrl">
            <button class="big-play" type="button" data-play="${c.id}" aria-label="${on ? 'Arrêter' : 'Écouter'} l'extrait">${icon(on ? 'stop' : 'play')}</button>
            <button class="btn btn-glass btn-sm" type="button" data-pl-toggle="${c.id}">${icon(inPl ? 'check' : 'plus')}${inPl ? 'Dans ma B.O.' : 'Ajouter à ma B.O.'}</button>
          </div>
          <div class="viz" data-track="${c.id}">${'<i></i>'.repeat(32)}</div>
        </div>
      </section>
      <p class="fine">L'extrait officiel de 30 s viendra d'un service de previews (Deezer ou Spotify). Ici, un motif synthétisé le remplace.</p>
      <section class="block"><p class="lede dropcap">${esc(c.desc)}</p>
        <dl class="facts"><div><dt>Artiste</dt><dd>${esc(c.artist)}</dd></div><div><dt>Année</dt><dd>${c.year}</dd></div><div><dt>Rôle dans le film</dt><dd>${esc(c.role)}</dd></div></dl></section>
      <section class="block">${secH('film', 'Film associé')}${guessBlock(c)}</section>`;
  }
  function actorBody(c) {
    const films = c.filmography.map(id => byId.get(id)).sort((a, b) => a.year - b.year);
    const revealed = films.filter(f => filmKnown(f.id)).length;
    return `
      <section class="block">${secH('user', 'Biographie')}<p class="lede dropcap">${esc(c.bio)}</p></section>
      <section class="block">${secH('film', 'Carrière', `${revealed} / ${films.length} films révélés`)}
        <ol class="timeline" style="list-style:none;margin:0">${films.map(f => `<li class="tl-item ${filmKnown(f.id) ? '' : 'locked'}"><span class="tl-year">${f.year}</span><span class="tl-dot"></span>${miniCard(f.id)}</li>`).join('')}</ol>
        <p class="fine">Chaque film se révèle quand tu obtiens sa carte.</p></section>
      <section class="block">${secH('character', 'Personnages')}<div class="mini-grid">${c.characters.map(id => miniCard(id)).join('')}</div></section>`;
  }

  function afterSheetRender(c, isFresh) {
    if (c.type === 'music' && isFresh && cardState(c) === 'owned' && !(player.current === c.id && player.playing)) playTrack(c.id);
    else if (c.type === 'music') loopViz();
  }

  /* ───────────── Inclinaison 3D + reflets ───────────── */
  let tiltEl = null;
  function resetTilt(el) {
    el.classList.remove('is-tilting');
    ['--rx', '--ry', '--px', '--py'].forEach(p => el.style.removeProperty(p));
  }
  document.addEventListener('pointermove', e => {
    const el = e.target.closest ? e.target.closest('.card:not(.is-unknown), .tiltable') : null;
    if (tiltEl && tiltEl !== el) resetTilt(tiltEl);
    tiltEl = el;
    if (!el || reduced()) return;
    if (e.pointerType === 'touch' && !el.classList.contains('hero-card')) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const max = el.classList.contains('hero-card') || el.classList.contains('tiltable') ? 20 : 13;
    el.classList.add('is-tilting');
    el.style.setProperty('--rx', ((.5 - y) * max).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((x - .5) * max * 1.2).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    el.style.setProperty('--px', ((x - .5) * 2).toFixed(3));
    el.style.setProperty('--py', ((y - .5) * 2).toFixed(3));
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
      save();
      renderSheet();
      const f = $('#found', sheet);
      if (f) {
        f.classList.add('revealing');
        f.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
        const r = f.querySelector('.card').getBoundingClientRect();
        setTimeout(() => sheetBurst(r.left + r.width / 2, r.top + r.height / 2), reduced() ? 0 : 350);
      }
      afterSheetRender(c, false);
      toast(`Bien vu ! « ${film.name} » apparaît désormais en grisé dans ta collection.`);
    } else {
      state.attempts[c.id] = (state.attempts[c.id] || 0) + 1;
      save();
      renderSheet();
      afterSheetRender(c, false);
      const g = $('#guess', sheet);
      const msg = $('.msg', g);
      msg.className = 'msg bad';
      msg.textContent = `« ${val.trim()} » n'est pas le bon film. Le titre reste secret.`;
      g.classList.add('shake');
      $('#guess-input', sheet).focus({ preventScroll: true });
    }
  }

  /* ───────────── Audio : extraits synthétisés (placeholders) ───────────── */
  const player = { ctx: null, master: null, analyser: null, bus: null, current: null, playing: false, startedAt: 0, timer: 0, queue: false, raf: 0 };
  const DUR = 12;
  function ensureCtx() {
    if (player.ctx) { if (player.ctx.state === 'suspended') player.ctx.resume(); return player.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = .22;
    const analyser = ctx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = .75;
    master.connect(analyser); analyser.connect(ctx.destination);
    Object.assign(player, { ctx, master, analyser });
    return ctx;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(ctx, bus, { t, f, d, type, vol, cutoff }) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    const g = ctx.createGain();
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = cutoff; flt.Q.value = 2;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(vol * .5, t + d * .5);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(flt); flt.connect(g); g.connect(bus);
    o.start(t); o.stop(t + d + .05);
  }
  function playTrack(id, { queue = false } = {}) {
    const c = byId.get(id);
    const ctx = ensureCtx();
    if (!ctx || !c || !c.motif) return;
    stopTrack(true);
    const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(player.master);
    const m = c.motif;
    const step = 60 / m.bpm / 2;
    const t0 = ctx.currentTime + .06;
    const steps = Math.floor(DUR / step);
    for (let i = 0; i < steps; i++) {
      const t = t0 + i * step;
      const deg = m.seq[i % m.seq.length];
      if (deg !== null) note(ctx, bus, { t, f: mtof(m.root + deg), d: step * 1.6, type: m.wave, vol: .32, cutoff: m.cutoff });
      if (i % 4 === 0) note(ctx, bus, { t, f: mtof(m.root - 24 + m.bass[Math.floor(i / 4) % m.bass.length]), d: step * 3.6, type: 'sine', vol: .5, cutoff: 600 });
      if (i % 4 === 2) note(ctx, bus, { t, f: 2600 + (i % 8) * 50, d: .04, type: 'square', vol: .04, cutoff: 9000 });
    }
    bus.gain.setValueAtTime(1, t0 + DUR - .6);
    bus.gain.linearRampToValueAtTime(0, t0 + DUR);
    Object.assign(player, { bus, current: id, playing: true, startedAt: t0, queue });
    clearTimeout(player.timer);
    player.timer = setTimeout(onTrackEnd, DUR * 1000 + 100);
    syncAudioUI();
    loopViz();
  }
  function stopTrack(silent) {
    clearTimeout(player.timer);
    if (player.bus) {
      const b = player.bus, ctx = player.ctx;
      b.gain.cancelScheduledValues(ctx.currentTime);
      b.gain.setValueAtTime(b.gain.value, ctx.currentTime);
      b.gain.linearRampToValueAtTime(0, ctx.currentTime + .08);
      setTimeout(() => b.disconnect(), 150);
      player.bus = null;
    }
    player.playing = false;
    if (!silent) syncAudioUI();
  }
  function onTrackEnd() {
    const wasQueue = player.queue, cur = player.current;
    stopTrack();
    if (wasQueue) {
      const i = state.playlist.indexOf(cur);
      if (i > -1 && i < state.playlist.length - 1) playTrack(state.playlist[i + 1], { queue: true });
    }
  }
  function nextTrack() {
    const list = state.playlist;
    if (!list.length) return;
    playTrack(list[(list.indexOf(player.current) + 1) % list.length], { queue: true });
  }
  function togglePlay(id, opts) {
    if (player.current === id && player.playing) stopTrack();
    else playTrack(id, opts);
  }
  function loopViz() {
    cancelAnimationFrame(player.raf);
    const data = new Uint8Array(player.analyser ? player.analyser.frequencyBinCount : 0);
    const tick = () => {
      const bars = $$('.viz');
      if (player.playing && player.analyser) {
        player.analyser.getByteFrequencyData(data);
        bars.forEach(v => {
          const live = v.dataset.track === player.current;
          $$('i', v).forEach((b, k) => { b.style.transform = `scaleY(${live ? Math.max(.05, data[k + 1] / 255) : .05})`; });
        });
        const p = $('.cap-progress');
        if (p) p.style.width = Math.min(100, (player.ctx.currentTime - player.startedAt) / DUR * 100) + '%';
        player.raf = requestAnimationFrame(tick);
      } else {
        bars.forEach(v => $$('i', v).forEach(b => { b.style.transform = 'scaleY(.05)'; }));
      }
    };
    tick();
  }
  function syncAudioUI() {
    renderCapsule();
    $$('.card.t-music').forEach(el => el.classList.toggle('is-playing', player.playing && el.dataset.id === player.current));
    $$('[data-play]').forEach(b => {
      const on = player.playing && b.dataset.play === player.current;
      b.innerHTML = icon(on ? 'stop' : 'play');
      b.setAttribute('aria-label', on ? 'Arrêter' : 'Écouter');
    });
    const deckOn = !!(player.playing && sheetStack.length && sheetStack.at(-1) === player.current);
    $$('.deck .vinyl', sheet).forEach(v => v.classList.toggle('spin', deckOn));
    $$('.deck .arm, .deck .led', sheet).forEach(v => v.classList.toggle('on', deckOn));
    if (route() === 'playlist' && sheet.hidden) {
      const y = window.scrollY; $('#view').innerHTML = viewPlaylist(); window.scrollTo(0, y);
    }
  }
  function renderCapsule() {
    const bar = $('#capsule');
    const c = player.current && byId.get(player.current);
    if (!c) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = `<div class="capsule-inner" style="${artVars(c)}">
      <span class="cap-art"><span class="vinyl ${player.playing ? 'spin' : ''}"></span></span>
      <button class="cap-meta" type="button" data-open="${c.id}"><b>${esc(c.name)}</b><span>${esc(c.artist)} — ${esc(filmLabelFor(c))}</span></button>
      <span class="cap-ctrl">
        <button class="icon-btn" type="button" data-play="${c.id}" aria-label="${player.playing ? 'Arrêter' : 'Écouter'}">${icon(player.playing ? 'stop' : 'play')}</button>
        <button class="icon-btn" type="button" data-next aria-label="Titre suivant de la B.O.">${icon('next')}</button>
      </span>
      <span class="cap-progress"></span>
    </div>`;
  }

  /* ───────────── Particules ───────────── */
  // Poussière dans le faisceau du projecteur
  function startDust() {
    const cv = $('#dust');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); window.addEventListener('resize', size);
    const half = y => 20 + y * Math.tan(15 * Math.PI / 180);
    const spawn = p => {
      p.y = Math.random() * h * .95; p.x = w / 2 + (Math.random() * 2 - 1) * half(p.y) * .9;
      p.vx = (Math.random() - .5) * .16; p.vy = -(.04 + Math.random() * .18);
      p.r = .5 + Math.random() * 1.7; p.a = .2 + Math.random() * .6; p.t = Math.random() * 6;
    };
    const P = Array.from({ length: 90 }, () => { const p = {}; spawn(p); return p; });
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffe9c4';
      for (const p of P) {
        p.x += p.vx; p.y += p.vy; p.t += .02;
        if (p.y < 0 || Math.abs(p.x - w / 2) > half(p.y)) spawn(p);
        ctx.globalAlpha = Math.max(0, p.a * (.55 + .45 * Math.sin(p.t * 3)) * (1 - p.y / h));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    if (reduced()) { draw(); return; }
    const loop = () => { if (!document.hidden) draw(); requestAnimationFrame(loop); };
    loop();
  }
  // Explosions de confettis et d'étincelles
  const fx = { parts: [], raf: 0, ctx: null };
  function setupBurst(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
    fx.ctx = cv.getContext('2d'); fx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.parts = [];
  }
  const RARITY_FX = {
    common: ['#e8ecf2', '#a3acb9'], uncommon: ['#3ddc97', '#c8ffe6'], rare: ['#3d8bff', '#a8cbff', '#ffffff'],
    epic: ['#b65cff', '#e6c2ff', '#ffffff'], legendary: ['#ffb627', '#ffe7a1', '#ffffff', '#ff8a00'],
    mythic: ['#ff4fa3', '#ffd166', '#4ee3c1', '#5d8bff', '#c77dff', '#ffffff']
  };
  function burst(x, y, colors, n, power) {
    if (reduced() || !fx.ctx) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (1.5 + Math.random() * 7) * power;
      fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5 * power, life: 0, max: 50 + Math.random() * 70,
        size: 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, color: colors[i % colors.length], spark: Math.random() < .4 });
    }
    if (!fx.raf) fx.raf = requestAnimationFrame(stepFx);
  }
  function stepFx() {
    const ctx = fx.ctx;
    if (!ctx) { fx.raf = 0; return; }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    fx.parts = fx.parts.filter(p => p.life < p.max);
    for (const p of fx.parts) {
      p.life++; p.vx *= .965; p.vy = p.vy * .965 + .2; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      if (p.spark) { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * .35 * t + .6, 0, 6.283); ctx.fill(); }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    fx.raf = fx.parts.length ? requestAnimationFrame(stepFx) : 0;
  }
  function sheetBurst(x, y) {
    let cv = $('#sheet-fx');
    if (!cv) { cv = document.createElement('canvas'); cv.id = 'sheet-fx'; cv.className = 'st-fx'; cv.style.zIndex = 55; document.body.appendChild(cv); }
    setupBurst(cv);
    burst(x, y, ['#4ee39a', '#f4c25a', '#ffffff', '#fff0bd'], 70, 1.1);
    setTimeout(() => { if (!fx.parts.length) cv.remove(); }, 2600);
  }

  /* ───────────── Ouverture de pack ───────────── */
  const stage = $('#stage');
  const DEMO_WEIGHTS = { common: 30, uncommon: 25, rare: 20, epic: 14, legendary: 8, mythic: 3 };
  function drawPack(pack) {
    const pool = pack.pool.slice();
    const out = [];
    const weight = id => DEMO_WEIGHTS[byId.get(id).rarity] * (isOwned(id) ? .5 : 1);
    while (out.length < Math.min(5, pack.pool.length)) {
      let r = Math.random() * pool.reduce((s, id) => s + weight(id), 0);
      const k = pool.findIndex(id => (r -= weight(id)) <= 0);
      out.push(pool.splice(k < 0 ? 0 : k, 1)[0]);
    }
    return out.sort((a, b) => rank(byId.get(a)) - rank(byId.get(b)));
  }
  function openPack(packId) {
    const pack = packById.get(packId);
    if (state.coins < pack.price) { toast('Pas assez de bobines. Ajoute-en avec le bouton + en haut.'); return; }
    stopTrack();
    if (!sheet.hidden) { sheet.hidden = true; sheet.innerHTML = ''; sheetStack = []; }
    stage.dataset.pack = packId;
    stage.setAttribute('style', packVars(pack));
    stage.classList.remove('open');
    stage.hidden = false;
    document.body.classList.add('no-scroll');
    stage.innerHTML = `
      <div class="st-spot"></div>
      <canvas class="st-fx" id="burst"></canvas>
      <div class="st-curtain l"></div><div class="st-curtain r"></div>
      <div class="st-valance"></div>
      <button class="icon-btn st-close" type="button" data-stage-close aria-label="Fermer">${icon('close')}</button>
      <div class="st-inner" id="st-inner">
        <div class="st-title"><span class="kicker">Pack ${esc(pack.name)} · ${esc(pack.edition)}</span><h2>Touchez le pack</h2><p class="serif">pour le déchirer</p></div>
        <div class="st-zone">
          <button class="st-pack" type="button" data-tear="${pack.id}" aria-label="Déchirer le pack">${packHTML(pack)}<span class="tear-strip">${packHTML(pack)}</span></button>
          <span class="st-floor"></span>
        </div>
        <p class="fine">${pack.price} bobines débitées à l'ouverture</p>
      </div>
      <div class="st-leader" hidden></div>
      <div class="st-flash"></div>`;
    setupBurst($('#burst', stage));
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('open')));
    $('[data-tear]', stage).focus({ preventScroll: true });
  }
  function flash(kind = '') {
    const f = $('.st-flash', stage);
    if (!f || reduced()) return;
    f.className = `st-flash ${kind}`; void f.offsetWidth; f.classList.add('go');
  }
  function quake() {
    const el = $('#st-inner', stage);
    if (!el || reduced()) return;
    el.classList.remove('quake'); void el.offsetWidth; el.classList.add('quake');
  }
  function slam(c) {
    if (reduced()) return;
    const el = document.createElement('div');
    el.className = `st-slam r-${c.rarity}`;
    el.textContent = RARITIES[c.rarity].label;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
  async function leader() {
    const el = $('.st-leader', stage);
    if (!el || reduced()) return;
    el.hidden = false;
    for (const n of [3, 2, 1]) { el.innerHTML = `<div class="ld"><span class="ld-sweep"></span><span class="ld-rings"></span><b>${n}</b></div>`; await wait(340); }
    el.hidden = true;
  }
  async function tearPack(packId) {
    const pack = packById.get(packId);
    const btn = $('[data-tear]', stage);
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    state.coins -= pack.price;
    const pulls = drawPack(pack);
    const before = new Set(state.owned);
    save(); renderChrome();
    $('.st-title h2', stage).textContent = 'Ça craque…';
    btn.classList.add('charging');
    await wait(900);
    btn.classList.add('torn');
    flash();
    const r = btn.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * .12, ['#ffffff', '#fff0bd', pack.colors[2]], 60, 1.2);
    await wait(450);
    await leader();
    if (!stage.isConnected || stage.hidden) return;
    $('#st-inner', stage).innerHTML = `
      <div class="st-title"><span class="kicker">Pack ${esc(pack.name)}</span><h2>Retourne tes cartes</h2><p class="serif">les plus rares se révèlent en dernier</p></div>
      <div class="pull-row">${pulls.map((id, i) => {
        const c = byId.get(id);
        return `<button class="flip r-${c.rarity} ${rank(c) >= 3 ? 'tease' : ''}" type="button" data-flip="${id}" data-new="${!before.has(id)}" style="--i:${i}" aria-label="Retourner la carte ${i + 1}">
          <span class="flip-rays"></span><span class="flip-glow"></span><span class="flip-aura"></span>
          <span class="flip-inner"><span class="face face-back">${cardBack()}</span><span class="face face-front"></span></span>
        </button>`;
      }).join('')}</div>
      <div class="st-actions"><button class="btn btn-glass" type="button" data-flip-all>Tout révéler</button></div>`;
  }
  function flipCard(btn) {
    const id = btn.dataset.flip;
    if (btn.classList.contains('flipped')) { closeStage(false); setTimeout(() => openCard(id, null), 50); return; }
    const c = byId.get(id);
    const k = rank(c);
    setOwned(id, true);
    save();
    $('.face-front', btn).innerHTML = cardHTML(c, { tag: 'div', isNew: btn.dataset.new === 'true' });
    btn.classList.add('flipped');
    if (k >= 4) btn.classList.add('big');
    btn.setAttribute('aria-label', `${c.name}, ${RARITIES[c.rarity].label}. Ouvrir la fiche`);
    const r = btn.getBoundingClientRect();
    setTimeout(() => {
      burst(r.left + r.width / 2, r.top + r.height / 2, RARITY_FX[c.rarity], 10 + k * 16, .55 + k * .22);
      if (k >= 5) { quake(); flash(k === 6 ? 'prism' : 'gold'); slam(c); }
    }, reduced() ? 0 : 260);
    if (c.type === 'music') setTimeout(() => playTrack(id), 400);
    if (!$$('.flip:not(.flipped)', stage).length) {
      const n = $$('.flip[data-new="true"]', stage).length;
      $('.st-actions', stage).innerHTML = `
        <p class="st-sum">${n} nouvelle${n > 1 ? 's' : ''} carte${n > 1 ? 's' : ''} pour ta cinémathèque. Touche une carte pour ouvrir sa fiche.</p>
        <a class="btn btn-glass" href="#collection" data-stage-close>Voir ma collection</a>
        <button class="btn btn-gold" type="button" data-open-pack="${stage.dataset.pack}">Rouvrir · ${packById.get(stage.dataset.pack).price}</button>`;
      renderChrome();
    }
  }
  function closeStage(rerender = true) {
    stage.hidden = true; stage.innerHTML = ''; stage.classList.remove('open');
    fx.parts = []; fx.ctx = null;
    document.body.classList.remove('no-scroll');
    if (rerender) render();
  }

  /* ───────────── Mode démo ───────────── */
  const demo = $('#demo');
  function renderDemo() {
    const universe = ['bttf', ...['character', 'location', 'music', 'actor'].flatMap(t => byId.get('bttf').universe[t])];
    const others = CARDS.filter(c => !universe.includes(c.id));
    const row = c => `<label><input type="checkbox" data-own="${c.id}" ${isOwned(c.id) ? 'checked' : ''}>${esc(c.name)}<small>${TYPES[c.type].label}<br>${RARITIES[c.rarity].label}</small></label>`;
    demo.innerHTML = `
      <header><div><span class="kicker">Maquette</span><h3>Mode démo</h3></div><button class="icon-btn" type="button" data-demo-close aria-label="Fermer">${icon('close')}</button></header>
      <p class="fine">Coche ou décoche des cartes pour voir les trois états (noire, grisée, révélée) sans ouvrir de pack.</p>
      <fieldset><legend>Univers Retour vers le futur</legend>${universe.map(id => row(byId.get(id))).join('')}
        <label><input type="checkbox" data-disc="bttf" ${isDiscovered('bttf') ? 'checked' : ''}>Film deviné (grisé)<small>état<br>découverte</small></label></fieldset>
      <fieldset><legend>Autres cartes</legend>${others.map(row).join('')}</fieldset>
      <div class="row">
        <button class="btn btn-sm btn-glass" type="button" data-demo="all">Tout obtenir</button>
        <button class="btn btn-sm btn-glass" type="button" data-demo="none">Tout retirer</button>
        <button class="btn btn-sm btn-glass" type="button" data-demo="coins">+500 bobines</button>
        <button class="btn btn-sm btn-velvet" type="button" data-demo="reset">Réinitialiser</button>
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

  /* ───────────── Toasts ───────────── */
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 3600);
  }

  /* ───────────── Événements ───────────── */
  document.addEventListener('click', e => {
    const t = e.target;
    const q = s => t.closest(s);
    let el;
    if ((el = q('[data-tour]'))) return tour(el.dataset.tour);
    if ((el = q('[data-feature]'))) {
      state.featured = el.dataset.feature; save(); render();
      const h = $('.hero'); if (h && !reduced()) h.animate([{ opacity: .3, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      return;
    }
    if ((el = q('[data-open-pack]'))) return openPack(el.dataset.openPack);
    if ((el = q('[data-tear]'))) return tearPack(el.dataset.tear);
    if ((el = q('[data-flip-all]'))) { $$('.flip:not(.flipped)', stage).forEach((b, i) => setTimeout(() => flipCard(b), i * 420)); el.remove(); return; }
    if ((el = q('[data-flip]'))) return flipCard(el);
    if ((el = q('[data-stage-close]'))) { closeStage(); return; }
    if ((el = q('[data-play]'))) { e.preventDefault(); return togglePlay(el.dataset.play, { queue: route() === 'playlist' && sheet.hidden && state.playlist.includes(el.dataset.play) }); }
    if ((el = q('[data-next]'))) return nextTrack();
    if ((el = q('[data-pl-playall]'))) return state.playlist.length && playTrack(state.playlist[0], { queue: true });
    if ((el = q('[data-pl-add]'))) { state.playlist.push(el.dataset.plAdd); save(); return render(); }
    if ((el = q('[data-pl-remove]'))) { state.playlist = state.playlist.filter(x => x !== el.dataset.plRemove); save(); return render(); }
    if ((el = q('[data-pl-toggle]'))) {
      const id = el.dataset.plToggle;
      const inPl = state.playlist.includes(id);
      state.playlist = inPl ? state.playlist.filter(x => x !== id) : [...state.playlist, id];
      save();
      el.innerHTML = `${icon(inPl ? 'plus' : 'check')}${inPl ? 'Ajouter à ma B.O.' : 'Dans ma B.O.'}`;
      toast(inPl ? 'Retirée de la playlist.' : `Ajoutée à « ${state.playlistName} ».`);
      return;
    }
    if ((el = q('[data-ftype]'))) { colFilter.type = el.dataset.ftype; return render(); }
    if ((el = q('[data-frarity]'))) { colFilter.rarity = el.dataset.frarity; return render(); }
    if ((el = q('[data-close]'))) return closeSheet();
    if ((el = q('[data-back]'))) return popCard();
    if ((el = q('[data-open]'))) return openCard(el.dataset.open, null);
    if ((el = q('#demo-open'))) return openDemo();
    if ((el = q('[data-demo-close]'))) return closeDemo();
    if ((el = q('[data-demo]'))) {
      const k = el.dataset.demo;
      if (k === 'all') CARDS.forEach(c => setOwned(c.id, true));
      if (k === 'none') { CARDS.forEach(c => setOwned(c.id, false)); state.discovered = []; }
      if (k === 'coins') state.coins += 500;
      if (k === 'reset') { stopTrack(); player.current = null; state = fresh(); }
      save(); if (!demo.hidden) renderDemo();
      if (stage.hidden) render(); else renderChrome();
      toast(k === 'reset' ? 'Démo réinitialisée.' : k === 'coins' ? '+500 bobines.' : 'Collection mise à jour.');
      return;
    }
    if ((el = q('button.card[data-id]'))) {
      if (!sheet.hidden && sheet.contains(el)) return pushCard(el.dataset.id, el);
      return openCard(el.dataset.id, el);
    }
    if (!sheet.hidden && t === sheet) closeSheet();
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-own]')) { setOwned(t.dataset.own, t.checked); save(); render(); }
    if (t.matches('[data-disc]')) {
      const id = t.dataset.disc;
      state.discovered = t.checked ? [...new Set([...state.discovered, id])] : state.discovered.filter(x => x !== id);
      save(); render();
    }
    if (t.id === 'pl-name') { state.playlistName = t.value.trim() || 'Ma playlist'; save(); toast('Playlist renommée.'); }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-guess]');
    if (f) { e.preventDefault(); submitGuess(f); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!demo.hidden) return closeDemo();
    if (!stage.hidden) return closeStage();
    if (!sheet.hidden) return sheetStack.length > 1 ? popCard() : closeSheet();
  });
  window.addEventListener('hashchange', () => { if (!sheet.hidden) closeSheet(); render(); window.scrollTo(0, 0); });

  render();
  startDust();
})();
