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
  const pad = n => String(n).padStart(3, '0');
  const rank = c => RARITIES[c.rarity].rank;
  const artVars = c => `--a1:${c.art[0]};--a2:${c.art[1]};--a3:${c.art[2]}`;
  const initials = name => name.split(/\s+/).filter(w => /^[A-ZÀ-Ý]/.test(w)).map(w => w[0]).join('').slice(0, 2);

  /* ───────────── État (mémoire + localStorage protégé) ───────────── */
  const KEY = 'cinedeck-demo-v1';
  const START = {
    owned: ['marty', 'biff', 'clocktower', 'power', 'johnny', 'mjfox', 'teenwolf', 'primer', 'moon', 'planete'],
    discovered: [],
    playlist: ['power', 'johnny'],
    playlistName: 'Ma B.O. culte',
    coins: 1250,
    attempts: {}
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

  /* ───────────── Rendu d'une carte ───────────── */
  function cardSub(c) {
    switch (c.type) {
      case 'film': return `${c.year} · ${c.director}`;
      case 'character': return byId.get(c.film).name;
      case 'location': return filmKnown(c.film) ? byId.get(c.film).name : 'Film : ? ? ?';
      case 'music': return c.artist;
      case 'actor': return `Né en ${c.born.match(/\d{4}/)[0]}`;
    }
    return '';
  }
  function artInner(c) {
    switch (c.type) {
      case 'film': return `<span class="sun"></span><span class="grid"></span><span class="art-year">${c.year}</span>`;
      case 'character': return `<span class="art-initials">${esc(initials(c.name))}</span><svg class="sil" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="40" r="19"/><path d="M12 102c2-26 18-40 38-40s36 14 38 40z"/></svg>`;
      case 'location': return `<span class="moon"></span><span class="skyline"></span><span class="art-coords">${esc(c.coords)}</span>`;
      case 'music': return `<span class="vinyl"></span>`;
      case 'actor': return `<span class="spot"></span><svg class="ico star" viewBox="0 0 24 24" aria-hidden="true">${ICONS.actor}</svg><span class="art-initials">${esc(initials(c.name))}</span>`;
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
        <span class="unk-ico">${icon(c.type)}</span><span class="unk-q">?</span>
        <span class="unk-label">${TYPES[c.type].label}</span>${opts.hint ? `<span class="unk-hint">${esc(opts.hint)}</span>` : ''}</${tag}>`;
    }
    const R = RARITIES[c.rarity];
    const playing = c.type === 'music' && player.current === c.id && player.playing ? 'is-playing' : '';
    return `<${tag} class="card r-${c.rarity} t-${c.type} ${st === 'discovered' ? 'is-discovered' : ''} ${playing} ${extra}" ${attrs} style="${artVars(c)}" aria-label="${esc(c.name)}, ${TYPES[c.type].label} ${R.label}${st === 'discovered' ? ', découvert' : ''}">
      <span class="card-frame">
        <span class="card-top"><span class="card-type">${icon(c.type)}${TYPES[c.type].label}</span><span class="gems" title="${R.label}">${'<i></i>'.repeat(R.rank)}</span></span>
        <span class="card-art art-${c.type}">${artInner(c)}</span>
        <span class="card-name">${esc(c.name)}</span>
        <span class="card-sub">${esc(cardSub(c))}</span>
        <span class="card-foot"><span>CD-${pad(c.no)}</span><b>${R.label}</b></span>
      </span>
      <span class="holo" aria-hidden="true"></span>
      ${st === 'discovered' ? '<span class="badge-disc">Découvert</span>' : ''}
      ${opts.isNew ? '<span class="badge-new">Nouveau</span>' : ''}
    </${tag}>`;
  }
  const cardBack = () => `<span class="card-back"><span class="back-logo">${icon('reel')}<span>CinéDeck</span></span></span>`;

  function packHTML(p) {
    return `<div class="pack" style="--p1:${p.colors[0]};--p2:${p.colors[1]};--p3:${p.colors[2]}">
      <span class="pack-crimp top"></span>
      <span class="pack-body">
        <span class="pack-brand"><span>CinéDeck</span>${icon('reel')}</span>
        <span class="pack-name">${esc(p.name)}</span>
        <span class="pack-ed">${esc(p.edition)}</span>
        <span class="pack-count">5 cartes</span>
      </span>
      <span class="pack-crimp bottom"></span>
      <span class="pack-foil"></span>
    </div>`;
  }

  /* ───────────── Navigation ───────────── */
  const ROUTES = [
    { id: 'packs', label: 'Packs', icon: 'packs' },
    { id: 'collection', label: 'Collection', icon: 'grid' },
    { id: 'playlist', label: 'Playlist', icon: 'music' },
    { id: 'profil', label: 'Profil', icon: 'user' }
  ];
  const route = () => { const h = location.hash.slice(1); return ROUTES.some(r => r.id === h) ? h : 'packs'; };
  function renderNav() {
    const cur = route();
    $('#nav').innerHTML = ROUTES.map(r => `<a href="#${r.id}" ${r.id === cur ? 'aria-current="page"' : ''}>${icon(r.icon)}<span>${r.label}</span></a>`).join('');
    $('#coins').innerHTML = `${icon('reel')}<span>${state.coins.toLocaleString('fr-FR')}</span>`;
  }
  function render() {
    renderNav();
    const v = $('#view');
    const r = route();
    v.innerHTML = r === 'collection' ? viewCollection() : r === 'playlist' ? viewPlaylist() : r === 'profil' ? viewProfile() : viewPacks();
    renderPlayerBar();
  }

  /* ───────────── Écran : Packs ───────────── */
  function viewPacks() {
    const f = PACKS.find(p => p.featured);
    const counts = TYPE_ORDER.map(t => [t, f.pool.filter(id => byId.get(id).type === t).length]).filter(([, n]) => n);
    return `
      <section class="screen-head">
        <p class="eyebrow">Boutique · Saison 1</p>
        <h1>Ouvre un pack, remplis ta cinémathèque</h1>
        <p class="lead">Films, personnages, lieux, musiques et acteurs. Chaque carte obtenue révèle un morceau de l'univers d'un film.</p>
      </section>

      <section class="tour" aria-label="Parcours de la maquette">
        <div><p class="eyebrow">Parcours de la maquette</p><p class="muted">Cinq raccourcis pour voir chaque mécanique sur l'exemple de <em>Retour vers le futur</em>.</p></div>
        <div class="tour-row">
          <button class="btn" data-tour="pack" type="button">${icon('packs')}Ouvrir un pack</button>
          <button class="btn" data-tour="film" type="button">${icon('film')}Fiche film complète</button>
          <button class="btn" data-tour="location" type="button">${icon('location')}Deviner le film d'un lieu</button>
          <button class="btn" data-tour="music" type="button">${icon('music')}Révéler une musique</button>
          <button class="btn" data-tour="actor" type="button">${icon('actor')}Filmographie d'un acteur</button>
        </div>
      </section>

      <section class="featured" aria-label="Pack à la une">
        <button class="featured-pack" type="button" data-open-pack="${f.id}" style="background:none;border:0" aria-label="Ouvrir le pack ${esc(f.name)}">${packHTML(f)}</button>
        <div class="featured-info">
          <p class="eyebrow">À la une</p>
          <h2>${esc(f.name)} — ${esc(f.edition)}</h2>
          <p class="muted">${esc(f.desc)}</p>
          <div class="contents">${counts.map(([t, n]) => `<span class="chip">${icon(t)}${n} ${TYPES[t].plural.toLowerCase()}</span>`).join('')}</div>
          <div class="odds" aria-label="Taux d'apparition">${RARITY_ORDER.map(r => `<div class="r-${r}"><span><i class="dot"></i>${RARITIES[r].label}</span><b>${RARITIES[r].odds}</b></div>`).join('')}</div>
          <div class="actions">
            <button class="btn btn-primary" type="button" data-open-pack="${f.id}">Ouvrir · ${icon('reel')} ${f.price}</button>
            <span class="fine">Taux affichés de la version finale. La démo les augmente pour montrer les cartes rares.</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Tous les packs</h2><span class="fine">${PACKS.length} thèmes · 5 cartes par pack</span></div>
        <div class="pack-grid">
          ${PACKS.map(p => `
            <article class="pack-tile">
              ${packHTML(p)}
              <div class="info">
                <h3>${esc(p.name)}</h3>
                <p>${esc(p.desc)}</p>
                <p class="fine">${p.pool.length} cartes dans ce pack</p>
                <button class="btn btn-sm btn-red" type="button" data-open-pack="${p.id}" style="justify-self:start">Ouvrir · ${p.price}</button>
              </div>
            </article>`).join('')}
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
    const pct = Math.round(owned / CARDS.length * 100);
    let list = CARDS.filter(c => (colFilter.type === 'all' || c.type === colFilter.type) && (colFilter.rarity === 'all' || c.rarity === colFilter.rarity));
    const types = colFilter.type === 'all' ? TYPE_ORDER : [colFilter.type];
    const sections = types.map(t => {
      const items = sortCards(list.filter(c => c.type === t));
      if (!items.length) return '';
      const got = items.filter(c => isOwned(c.id)).length;
      return `<section class="type-section"><h2>${icon(t)}${TYPES[t].plural} <small>${got} / ${items.length}</small></h2>
        <div class="card-grid">${items.map(c => cardHTML(c)).join('')}</div></section>`;
    }).join('');
    return `
      <section class="screen-head">
        <p class="eyebrow">Ma cinémathèque</p>
        <h1>Collection</h1>
      </section>
      <section class="progress" aria-label="Progression">
        <div class="progress-meta"><span>${owned} / ${CARDS.length} cartes obtenues</span><span>${state.discovered.length} film${state.discovered.length > 1 ? 's' : ''} deviné${state.discovered.length > 1 ? 's' : ''} · ${pct} %</span></div>
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <div class="legend">
          <span><i style="background:linear-gradient(150deg,var(--r-legendary),#6b4d12)"></i>Obtenue</span>
          <span><i style="background:#6d6870"></i>Découverte (film deviné, pas encore obtenu)</span>
          <span><i style="background:#141016;border:1px dashed #3a3040"></i>Inconnue</span>
        </div>
      </section>
      <section class="filters" aria-label="Filtres">
        <div class="filter-row" role="group" aria-label="Type">
          <button class="chip" type="button" data-ftype="all" aria-pressed="${colFilter.type === 'all'}">Toutes <span class="count">${CARDS.length}</span></button>
          ${TYPE_ORDER.map(t => `<button class="chip" type="button" data-ftype="${t}" aria-pressed="${colFilter.type === t}">${icon(t)}${TYPES[t].plural} <span class="count">${CARDS.filter(c => c.type === t).length}</span></button>`).join('')}
        </div>
        <div class="filter-row" role="group" aria-label="Rareté">
          <button class="chip" type="button" data-frarity="all" aria-pressed="${colFilter.rarity === 'all'}">Toutes raretés</button>
          ${RARITY_ORDER.map(r => `<button class="chip r-${r}" type="button" data-frarity="${r}" aria-pressed="${colFilter.rarity === r}"><i class="dot"></i>${RARITIES[r].label}</button>`).join('')}
        </div>
      </section>
      ${sections || '<p class="muted">Aucune carte pour ce filtre.</p>'}`;
  }

  /* ───────────── Écran : Playlist ───────────── */
  function filmLabelFor(c) { return filmKnown(c.film) ? byId.get(c.film).name : 'Film : ? ? ?'; }
  function viewPlaylist() {
    const tracks = state.playlist.map(id => byId.get(id)).filter(Boolean);
    const ownedNotIn = CARDS.filter(c => c.type === 'music' && isOwned(c.id) && !state.playlist.includes(c.id));
    const locked = CARDS.filter(c => c.type === 'music' && !isOwned(c.id)).length;
    const row = (c, i, inList) => `
      <li class="track ${player.current === c.id ? 'is-current' : ''}" style="${artVars(c)}">
        <span class="n">${player.current === c.id && player.playing ? '<span class="eq"><i></i><i></i><i></i></span>' : i}</span>
        <span class="thumb"><span class="vinyl"></span></span>
        <span class="t"><b>${esc(c.name)}</b><span>${esc(c.artist)} · ${esc(filmLabelFor(c))}</span></span>
        <span class="acts">
          <button class="icon-btn" type="button" data-play="${c.id}" aria-label="${player.current === c.id && player.playing ? 'Arrêter' : 'Écouter'} ${esc(c.name)}">${icon(player.current === c.id && player.playing ? 'stop' : 'play')}</button>
          ${inList
            ? `<button class="icon-btn" type="button" data-pl-remove="${c.id}" aria-label="Retirer de la playlist">${icon('close')}</button>`
            : `<button class="icon-btn" type="button" data-pl-add="${c.id}" aria-label="Ajouter à la playlist">${icon('plus')}</button>`}
        </span>
      </li>`;
    return `
      <section class="pl-head">
        <div class="pl-cover"><span class="vinyl ${player.playing ? 'spin' : ''}"></span></div>
        <div style="display:grid;gap:8px;min-width:0">
          <p class="eyebrow">Playlist · musiques obtenues</p>
          <label class="sr-only" for="pl-name">Nom de la playlist</label>
          <input class="pl-title-input" id="pl-name" value="${esc(state.playlistName)}" maxlength="40">
          <p class="fine">${tracks.length} titre${tracks.length > 1 ? 's' : ''} · extraits de 12 s</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" type="button" data-pl-playall ${tracks.length ? '' : 'disabled'}>${icon('play')}Tout écouter</button>
          </div>
        </div>
      </section>
      <section class="section">
        <h3>Dans la playlist</h3>
        ${tracks.length ? `<ol class="tracks">${tracks.map((c, i) => row(c, i + 1, true)).join('')}</ol>` : '<p class="muted">Ajoute des musiques obtenues pour composer ta bande originale.</p>'}
      </section>
      ${ownedNotIn.length ? `<section class="section"><h3>Musiques obtenues à ajouter</h3><ul class="tracks">${ownedNotIn.map((c, i) => row(c, '+', false)).join('')}</ul></section>` : ''}
      <section class="section">
        <h3>Encore à trouver</h3>
        <ul class="tracks">${Array.from({ length: locked }, () => `<li class="track locked"><span class="n">·</span><span class="thumb">${icon('lock')}</span><span class="t"><b>Musique non obtenue</b><span>Trouve-la dans un pack pour l'écouter</span></span><span></span></li>`).join('') || '<li class="fine">Toutes les musiques sont obtenues.</li>'}</ul>
      </section>`;
  }

  /* ───────────── Écran : Profil & guide ───────────── */
  const SAMPLE = r => ({ id: 'sample-' + r, type: 'film', rarity: r, name: RARITIES[r].label, year: '★'.repeat(RARITIES[r].rank), director: '', no: RARITIES[r].rank,
    art: { common: ['#6c757d', '#1b1b1f', '#c5c6c7'], uncommon: ['#2d6a4f', '#081c15', '#95d5b2'], rare: ['#1d4ed8', '#0b1430', '#93c5fd'], epic: ['#7b2cbf', '#10002b', '#e0aaff'], legendary: ['#c98a12', '#2b1a03', '#ffe08a'], mythic: ['#ff5fa2', '#1a0b2e', '#5cf2c4'] }[r] });
  function viewProfile() {
    const owned = state.owned.map(id => byId.get(id)).filter(Boolean);
    const perType = TYPE_ORDER.map(t => [t, owned.filter(c => c.type === t).length]);
    const demoFilm = byId.get('bttf');
    return `
      <section class="screen-head">
        <p class="eyebrow">Profil</p>
        <h1>Théo · Cinéphile</h1>
      </section>
      <section class="stats">
        <div class="stat"><b>${owned.length}</b><span>cartes obtenues sur ${CARDS.length}</span></div>
        ${perType.map(([t, n]) => `<div class="stat"><b>${n}</b><span>${TYPES[t].plural.toLowerCase()}</span></div>`).join('')}
        <div class="stat"><b>${state.discovered.length}</b><span>films devinés</span></div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Hiérarchie des raretés</h2><span class="fine">Cadre, gemmes et effet holographique montent avec la rareté</span></div>
        <div class="ladder">${RARITY_ORDER.map(r => { const s = SAMPLE(r); s.director = RARITIES[r].odds; return `<figure>${cardHTML(s, { state: 'owned', tag: 'div' })}<figcaption><b>${RARITIES[r].label}<small>${RARITIES[r].odds}</small></b><span>${RARITIES[r].desc}</span></figcaption></figure>`; }).join('')}</div>
      </section>
      <section class="section">
        <h2>Les trois états d'une carte</h2>
        <div class="states">
          <figure>${cardHTML(demoFilm, { state: 'unknown', tag: 'div' })}<figcaption><b>Inconnue</b>Noire : tu ne sais pas ce qui se cache dessous.</figcaption></figure>
          <figure>${cardHTML(demoFilm, { state: 'discovered', tag: 'div' })}<figcaption><b>Découverte</b>Grisée : film deviné grâce à un lieu ou une musique.</figcaption></figure>
          <figure>${cardHTML(demoFilm, { state: 'owned', tag: 'div' })}<figcaption><b>Obtenue</b>En couleurs, avec la fiche complète.</figcaption></figure>
        </div>
      </section>`;
  }

  /* ───────────── Fiche détaillée ───────────── */
  let sheetStack = [];
  const sheet = $('#sheet');

  function openCard(id, srcEl) {
    const c = byId.get(id);
    if (!c) return;
    const st = cardState(c);
    if (st === 'unknown') { lockedFeedback(c, srcEl); return; }
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
    const hero = $('.sh-hero .card', sheet);
    if (hero && !reduced()) hero.animate([{ transform: 'rotateY(-90deg) scale(.9)' }, { transform: 'rotateY(0)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
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
    const packs = c.packs.map(p => packById.get(p).name).join(', ');
    toast(`${TYPES[c.type].label} pas encore obtenu. À trouver dans : ${packs}.`);
  }

  function flyIn(srcEl) {
    const hero = $('.sh-hero .card', sheet);
    if (!srcEl || !hero || reduced() || !srcEl.isConnected) return;
    const from = srcEl.getBoundingClientRect();
    const to = hero.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const clone = srcEl.cloneNode(true);
    clone.classList.remove('shake');
    Object.assign(clone.style, { position: 'fixed', left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', margin: 0, zIndex: 80, pointerEvents: 'none' });
    document.body.appendChild(clone);
    hero.style.visibility = 'hidden';
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    const s = to.width / from.width;
    const anim = clone.animate([
      { transform: 'perspective(1200px) translate(0,0) scale(1) rotateY(0)' },
      { transform: `perspective(1200px) translate(${dx * .5}px, ${dy * .5 - 40}px) scale(${(1 + s) / 2 * 1.1}) rotateY(180deg)`, offset: .55 },
      { transform: `perspective(1200px) translate(${dx}px, ${dy}px) scale(${s}) rotateY(360deg)` }
    ], { duration: 820, easing: 'cubic-bezier(.25,.75,.25,1)' });
    const done = () => { clone.remove(); hero.style.visibility = ''; };
    anim.onfinish = done; anim.oncancel = done;
  }

  function renderSheet() {
    const c = byId.get(sheetStack.at(-1));
    const st = cardState(c);
    const R = RARITIES[c.rarity];
    const body = { film: filmBody, character: characterBody, location: locationBody, music: musicBody, actor: actorBody }[c.type](c, st);
    sheet.innerHTML = `
      <div class="sheet-panel" style="${artVars(c)}">
        <div class="sheet-bar">
          ${sheetStack.length > 1 ? `<button class="btn btn-sm" type="button" data-back>${icon('back')}Retour</button>` : '<span></span>'}
          <button class="icon-btn" type="button" data-close aria-label="Fermer">${icon('close')}</button>
        </div>
        <div class="sheet-layout">
          <div class="sh-hero">${cardHTML(c, { tag: 'div', cls: 'hero-card' })}<span class="hint">Inclinez la carte · CD-${pad(c.no)}</span></div>
          <div class="sh-body">
            <header class="sh-head">
              <p class="eyebrow">${TYPES[c.type].label} · ${R.label}${st === 'discovered' ? ' · Découvert, non obtenu' : ''}</p>
              <h2>${esc(c.name)}</h2>
              ${headExtra(c, st)}
            </header>
            ${body}
          </div>
        </div>
      </div>`;
  }
  function headExtra(c) {
    if (c.type === 'film') return `${c.original ? `<p class="orig">${esc(c.original)}</p>` : ''}<div class="meta"><span class="chip">${c.year}</span>${c.duration ? `<span class="chip">${c.duration}</span>` : ''}<span class="chip">${esc(c.director)}</span>${(c.genres || []).map(g => `<span class="chip">${esc(g)}</span>`).join('')}</div>`;
    if (c.type === 'character') return c.fullName ? `<p class="orig">${esc(c.fullName)}</p>` : '';
    if (c.type === 'location') return `<p class="orig">${esc(c.place)}</p>`;
    if (c.type === 'music') return `<p class="orig">${esc(c.artist)} · ${c.year}</p>`;
    if (c.type === 'actor') return `<p class="orig">${esc(c.born)}</p>`;
    return '';
  }
  const miniCard = (id, hint) => cardHTML(byId.get(id), { hint, cls: 'mini' });

  function filmBody(c, st) {
    if (st === 'discovered') {
      return `<section class="sh-block"><p>${esc(c.blurb || 'Tu as identifié ce film grâce à un lieu ou une musique.')}</p></section>
        <section class="sh-block" style="padding:16px;border-radius:16px;background:var(--surface);border:1px dashed var(--line)">
          <h3>${icon('lock')}Fiche verrouillée</h3>
          <p>Obtiens la carte dans un pack ${esc(c.packs.map(p => packById.get(p).name).join(' ou '))} pour débloquer le synopsis, la bande-annonce, les plateformes et les critiques.</p>
        </section>`;
    }
    if (!c.synopsis) {
      return `<section class="sh-block"><h3>Synopsis</h3><p>${esc(c.blurb)}</p></section>
        <section class="sh-block"><p class="fine">Fiche courte dans la maquette. La version finale chargera synopsis, bande-annonce, plateformes et critiques depuis TMDB.</p></section>
        ${actorsOf(c)}`;
    }
    const groups = ['character', 'location', 'music', 'actor'].map(t => {
      const ids = c.universe[t] || [];
      const got = ids.filter(isOwned).length;
      return `<div class="uni-group"><h4><span>${icon(t)}${TYPES[t].plural}</span><em>${got} / ${ids.length}</em></h4>
        <div class="mini-grid">${ids.map(id => miniCard(id)).join('')}</div></div>`;
    }).join('');
    return `
      <section class="sh-block"><h3>Synopsis</h3><p>${esc(c.synopsis)}</p>
        <dl class="facts"><div><dt>Réalisation</dt><dd>${esc(c.director)}</dd></div><div><dt>Scénario</dt><dd>${esc(c.writers)}</dd></div></dl></section>
      <section class="sh-block"><h3>Bande-annonce</h3>
        <a class="trailer" href="${c.trailer}" target="_blank" rel="noopener">
          <span class="play">${icon('play')}</span>
          <span class="cap"><span>${esc(c.name)}</span><span>Bande-annonce VF · s'ouvre sur YouTube</span></span>
        </a></section>
      <section class="sh-block"><h3>Où le regarder</h3>
        <div class="streams">${c.streaming.map(s => `<a class="stream" href="${c.watch}" target="_blank" rel="noopener"><b>${esc(s.name)}${icon('external')}</b><span>${esc(s.kind)}</span></a>`).join('')}</div>
        <p class="fine">Disponibilités d'exemple. La version finale les lira dans TMDB (watch providers, région France).</p></section>
      <section class="sh-block"><h3>Critiques TMDB <small>données d'exemple</small></h3>
        <div class="tmdb">
          <div class="ring" style="--v:${c.tmdb.score}"><b>${c.tmdb.score}<sup>%</sup></b></div>
          <div><b>Note des membres TMDB</b><p class="fine">${c.tmdb.votes}</p></div>
          <div class="reviews">${c.tmdb.reviews.map(r => `<article class="review"><header><b>${esc(r.author)}</b><span>${r.rating}/10</span></header><p>${esc(r.text)}</p></article>`).join('')}</div>
        </div></section>
      <section class="sh-block"><h3>Univers du film <small>${['character', 'location', 'music', 'actor'].reduce((n, t) => n + c.universe[t].filter(isOwned).length, 0)} / ${['character', 'location', 'music', 'actor'].reduce((n, t) => n + c.universe[t].length, 0)} cartes révélées</small></h3>
        <div class="universe">${groups}</div></section>`;
  }
  function actorsOf(film) {
    const actors = CARDS.filter(a => a.type === 'actor' && a.filmography.includes(film.id));
    if (!actors.length) return '';
    return `<section class="sh-block"><h3>Avec</h3><div class="mini-grid">${actors.map(a => miniCard(a.id)).join('')}</div></section>`;
  }
  function characterBody(c) {
    return `
      <section class="sh-block"><p>${esc(c.desc)}</p>
        <dl class="facts">${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}${c.actorName ? `<div><dt>Interprété par</dt><dd>${esc(c.actorName)}</dd></div>` : ''}</dl></section>
      <section class="sh-block"><h3>Liens</h3>
        <div class="mini-grid">
          <figure>${miniCard(c.film)}<figcaption>Film</figcaption></figure>
          ${c.actor ? `<figure>${miniCard(c.actor)}<figcaption>Interprète</figcaption></figure>` : ''}
        </div></section>`;
  }
  function guessBlock(c) {
    const film = byId.get(c.film);
    if (filmKnown(film.id)) {
      return `<div class="found" id="found">${miniCard(film.id)}<div style="display:grid;gap:6px"><b>Film trouvé : ${esc(film.name)}</b><p class="fine">${isOwned(film.id) ? 'Tu possèdes ce film, sa fiche complète est débloquée.' : 'Le film apparaît en grisé dans ta collection. Obtiens sa carte pour débloquer sa fiche.'}</p></div></div>`;
    }
    const tries = state.attempts[c.id] || 0;
    const shown = c.hints.slice(0, Math.min(tries, c.hints.length));
    return `<div class="guess" id="guess">
      ${cardHTML(film, { state: 'unknown', tag: 'div' })}
      <form data-guess="${c.id}" autocomplete="off">
        <label for="guess-input">De quel film vient ${c.type === 'music' ? 'cette musique' : 'ce lieu'} ?</label>
        <div class="field"><input id="guess-input" name="g" placeholder="Titre du film (FR ou VO)" enterkeyhint="send"><button class="btn btn-primary" type="submit">Proposer</button></div>
        <p class="msg" aria-live="polite">${tries ? `${tries} essai${tries > 1 ? 's' : ''}. Un indice se débloque à chaque erreur.` : 'Sans la carte du film, le titre reste secret. Trouve-le pour le faire apparaître.'}</p>
        ${shown.length ? `<ul class="hints">${shown.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
      </form>
    </div>`;
  }
  function locationBody(c) {
    return `
      <section class="sh-block"><p>${esc(c.desc)}</p>
        <dl class="facts"><div><dt>Lieu de tournage</dt><dd>${esc(c.shooting)}</dd></div><div><dt>Coordonnées</dt><dd style="font-family:var(--f-mono);font-weight:500">${esc(c.coords)}</dd></div></dl></section>
      <section class="sh-block"><h3>Film associé</h3>${guessBlock(c)}</section>`;
  }
  function musicBody(c) {
    const on = player.current === c.id && player.playing;
    const inPl = state.playlist.includes(c.id);
    return `
      <section class="listen" style="${artVars(c)}">
        <div class="listen-top">
          <button class="big-play" type="button" data-play="${c.id}" aria-label="${on ? 'Arrêter' : 'Écouter'} l'extrait">${icon(on ? 'stop' : 'play')}</button>
          <div class="listen-title"><b>${esc(c.name)}</b><span>Extrait 0:12 · motif de démonstration</span></div>
          <button class="btn btn-sm" type="button" data-pl-toggle="${c.id}">${icon(inPl ? 'check' : 'plus')}${inPl ? 'Dans ma playlist' : 'Ajouter à ma playlist'}</button>
        </div>
        <div class="viz" data-track="${c.id}">${'<i></i>'.repeat(32)}</div>
        <p class="fine">L'extrait officiel (30 s) viendra d'un service de previews (Deezer ou Spotify). Ici, un motif synthétisé le remplace.</p>
      </section>
      <section class="sh-block"><p>${esc(c.desc)}</p>
        <dl class="facts"><div><dt>Artiste</dt><dd>${esc(c.artist)}</dd></div><div><dt>Année</dt><dd>${c.year}</dd></div><div><dt>Type</dt><dd>${esc(c.role)}</dd></div></dl></section>
      <section class="sh-block"><h3>Film associé</h3>${guessBlock(c)}</section>`;
  }
  function actorBody(c) {
    const films = c.filmography.map(id => byId.get(id)).sort((a, b) => a.year - b.year);
    const revealed = films.filter(f => filmKnown(f.id)).length;
    return `
      <section class="sh-block"><h3>Biographie</h3><p>${esc(c.bio)}</p></section>
      <section class="sh-block"><h3>Filmographie <small>${revealed} / ${films.length} révélés</small></h3>
        <div class="mini-grid">${films.map(f => `<figure>${miniCard(f.id, String(f.year))}<figcaption>${filmKnown(f.id) ? f.year : 'À découvrir'}</figcaption></figure>`).join('')}</div>
        <p class="fine">Chaque film se révèle quand tu obtiens sa carte.</p></section>
      <section class="sh-block"><h3>Personnages</h3><div class="mini-grid">${c.characters.map(id => miniCard(id)).join('')}</div></section>`;
  }

  function afterSheetRender(c, fresh) {
    if (c.type === 'music' && fresh && cardState(c) === 'owned' && !(player.current === c.id && player.playing)) playTrack(c.id);
    bindTilt($('.sh-hero .card', sheet));
  }
  function bindTilt(el) {
    if (!el) return;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (x * 100) + '%');
      el.style.setProperty('--my', (y * 100) + '%');
      if (!reduced()) el.style.transform = `rotateX(${(0.5 - y) * 16}deg) rotateY(${(x - 0.5) * 20}deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }

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
      if (f) { f.classList.add('revealing'); f.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
      bindTilt($('.sh-hero .card', sheet));
      toast(`Bien vu ! « ${film.name} » apparaît désormais en grisé dans ta collection.`);
    } else {
      state.attempts[c.id] = (state.attempts[c.id] || 0) + 1;
      save();
      renderSheet();
      bindTilt($('.sh-hero .card', sheet));
      const g = $('#guess', sheet);
      const msg = $('.msg', g);
      msg.className = 'msg bad';
      msg.textContent = `« ${val.trim()} » n'est pas le bon film. Le titre reste secret.`;
      g.classList.add('shake');
      $('#guess-input', sheet).focus({ preventScroll: true });
    }
  }

  /* ───────────── Audio : extraits synthétisés (placeholders) ───────────── */
  const player = { ctx: null, master: null, analyser: null, bus: null, current: null, playing: false, startedAt: 0, dur: 12, timer: 0, queue: false, raf: 0 };
  const DUR = 12;
  function ensureCtx() {
    if (player.ctx) return player.ctx.state === 'suspended' ? (player.ctx.resume(), player.ctx) : player.ctx;
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
      if (i % 4 === 0) {
        const b = m.bass[Math.floor(i / 4) % m.bass.length];
        note(ctx, bus, { t, f: mtof(m.root - 24 + b), d: step * 3.6, type: 'sine', vol: .5, cutoff: 600 });
      }
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
    const wasQueue = player.queue;
    const cur = player.current;
    stopTrack();
    if (wasQueue) {
      const i = state.playlist.indexOf(cur);
      if (i > -1 && i < state.playlist.length - 1) playTrack(state.playlist[i + 1], { queue: true });
    }
  }
  function nextTrack() {
    const list = state.playlist;
    if (!list.length) return;
    const i = list.indexOf(player.current);
    playTrack(list[(i + 1) % list.length], { queue: true });
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
          $$('i', v).forEach((b, k) => { b.style.transform = `scaleY(${live ? Math.max(.06, data[k + 1] / 255) : .06})`; });
        });
        const p = $('.pb-progress');
        if (p) p.style.width = Math.min(100, (player.ctx.currentTime - player.startedAt) / DUR * 100) + '%';
        player.raf = requestAnimationFrame(tick);
      } else {
        bars.forEach(v => $$('i', v).forEach(b => { b.style.transform = 'scaleY(.06)'; }));
      }
    };
    tick();
  }
  function syncAudioUI() {
    renderPlayerBar();
    $$('.card.t-music').forEach(el => el.classList.toggle('is-playing', player.playing && el.dataset.id === player.current));
    $$('[data-play]').forEach(b => {
      const on = player.playing && b.dataset.play === player.current;
      b.innerHTML = icon(on ? 'stop' : 'play');
      b.setAttribute('aria-label', on ? 'Arrêter' : 'Écouter');
    });
    if (route() === 'playlist' && sheet.hidden) {
      const y = window.scrollY; $('#view').innerHTML = viewPlaylist(); window.scrollTo(0, y);
    }
  }
  function renderPlayerBar() {
    const bar = $('#playerbar');
    const c = player.current && byId.get(player.current);
    if (!c) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = `<div class="playerbar-inner" style="${artVars(c)}">
      <span class="pb-art"><span class="vinyl ${player.playing ? 'spin' : ''}"></span></span>
      <button class="pb-meta" type="button" data-open="${c.id}" style="background:none;border:0;padding:0;text-align:left"><b>${esc(c.name)}</b><span>${esc(c.artist)} · ${esc(filmLabelFor(c))}</span></button>
      <span class="pb-ctrl">
        <button class="icon-btn" type="button" data-play="${c.id}" aria-label="${player.playing ? 'Arrêter' : 'Écouter'}">${icon(player.playing ? 'stop' : 'play')}</button>
        <button class="icon-btn" type="button" data-next aria-label="Titre suivant de la playlist">${icon('next')}</button>
      </span>
      <span class="pb-progress"></span>
    </div>`;
  }

  /* ───────────── Ouverture de pack ───────────── */
  const stage = $('#stage');
  const DEMO_WEIGHTS = { common: 30, uncommon: 25, rare: 20, epic: 14, legendary: 8, mythic: 3 };
  function drawPack(pack) {
    const pool = pack.pool.slice();
    const out = [];
    const n = Math.min(5, pool.length);
    while (out.length < n) {
      const total = pool.reduce((s, id) => s + DEMO_WEIGHTS[byId.get(id).rarity] * (isOwned(id) ? .5 : 1), 0);
      let r = Math.random() * total;
      const k = pool.findIndex(id => (r -= DEMO_WEIGHTS[byId.get(id).rarity] * (isOwned(id) ? .5 : 1)) <= 0);
      out.push(pool.splice(k < 0 ? 0 : k, 1)[0]);
    }
    return out.sort((a, b) => rank(byId.get(a)) - rank(byId.get(b)));
  }
  function openPack(packId) {
    const pack = packById.get(packId);
    if (state.coins < pack.price) { toast('Pas assez de bobines. Ajoute-en depuis le mode démo.'); return; }
    stopTrack();
    stage.dataset.pack = packId;
    stage.hidden = false;
    document.body.classList.add('no-scroll');
    stage.innerHTML = `
      <button class="icon-btn stage-close" type="button" data-stage-close aria-label="Fermer">${icon('close')}</button>
      <div class="stage-inner">
        <div class="stage-title"><p class="eyebrow">Pack ${esc(pack.name)}</p><h2>Touchez le pack pour l'ouvrir</h2></div>
        <button class="stage-pack" type="button" data-tear="${pack.id}" aria-label="Déchirer le pack">${packHTML(pack)}<span class="tear-strip">${packHTML(pack)}</span></button>
        <p class="fine">${icon('reel')} ${pack.price} bobines</p>
      </div>`;
    $('[data-tear]', stage).focus({ preventScroll: true });
  }
  function tearPack(packId) {
    const pack = packById.get(packId);
    const btn = $('[data-tear]', stage);
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    state.coins -= pack.price;
    const pulls = drawPack(pack);
    const before = new Set(state.owned);
    save(); renderNav();
    btn.classList.add('tearing');
    const delay = reduced() ? 0 : 1000;
    setTimeout(() => btn.classList.add('torn'), reduced() ? 0 : 600);
    setTimeout(() => {
      $('.stage-inner', stage).innerHTML = `
        <div class="stage-title"><p class="eyebrow">Pack ${esc(pack.name)}</p><h2>Retourne tes cartes</h2></div>
        <div class="pull-row">${pulls.map((id, i) => {
          const c = byId.get(id);
          return `<button class="flip r-${c.rarity} ${rank(c) >= 4 ? 'big' : ''}" type="button" data-flip="${id}" data-new="${!before.has(id)}" style="animation-delay:${i * 110}ms" aria-label="Retourner la carte ${i + 1}">
            <span class="rays"></span><span class="glow"></span>
            <span class="flip-inner"><span class="face face-back">${cardBack()}</span><span class="face face-front"></span></span>
          </button>`;
        }).join('')}</div>
        <div class="stage-actions"><button class="btn" type="button" data-flip-all>Tout révéler</button></div>`;
    }, delay);
  }
  function flipCard(btn) {
    if (btn.classList.contains('flipped')) {
      // Carte déjà retournée : ouvrir sa fiche
      const id = btn.dataset.flip;
      closeStage(false);
      setTimeout(() => openCard(id, null), 50);
      return;
    }
    const id = btn.dataset.flip;
    const c = byId.get(id);
    const isNew = btn.dataset.new === 'true';
    setOwned(id, true);
    save();
    $('.face-front', btn).innerHTML = cardHTML(c, { tag: 'div', isNew });
    btn.classList.add('flipped');
    btn.setAttribute('aria-label', `${c.name}, ${RARITIES[c.rarity].label}. Ouvrir la fiche`);
    if (c.type === 'music') setTimeout(() => playTrack(id), 350);
    const left = $$('.flip:not(.flipped)', stage).length;
    if (!left) {
      const newCount = $$('.flip[data-new="true"]', stage).length;
      $('.stage-actions', stage).innerHTML = `
        <p class="muted" style="width:100%;text-align:center">${newCount} nouvelle${newCount > 1 ? 's' : ''} carte${newCount > 1 ? 's' : ''} · touche une carte pour ouvrir sa fiche</p>
        <a class="btn" href="#collection" data-stage-close>Voir ma collection</a>
        <button class="btn btn-primary" type="button" data-open-pack="${stage.dataset.pack}">Rouvrir · ${packById.get(stage.dataset.pack).price}</button>`;
    }
  }
  function closeStage(rerender = true) {
    stage.hidden = true; stage.innerHTML = '';
    document.body.classList.remove('no-scroll');
    if (rerender) render();
  }

  /* ───────────── Mode démo ───────────── */
  const demo = $('#demo');
  function renderDemo() {
    const universe = ['bttf', ...['character', 'location', 'music', 'actor'].flatMap(t => byId.get('bttf').universe[t])];
    const others = CARDS.filter(c => !universe.includes(c.id));
    const row = c => `<label><input type="checkbox" data-own="${c.id}" ${isOwned(c.id) ? 'checked' : ''}>${esc(c.name)}<small>${TYPES[c.type].label} · ${RARITIES[c.rarity].label}</small></label>`;
    demo.innerHTML = `
      <header><div><p class="eyebrow">Maquette</p><h3>Mode démo</h3></div><button class="icon-btn" type="button" data-demo-close aria-label="Fermer">${icon('close')}</button></header>
      <p class="fine">Coche ou décoche des cartes pour voir les trois états (noire, grisée, révélée) sans ouvrir de pack.</p>
      <fieldset><legend>Univers Retour vers le futur</legend>${universe.map(id => row(byId.get(id))).join('')}
        <label><input type="checkbox" data-disc="bttf" ${isDiscovered('bttf') ? 'checked' : ''}>Film deviné (grisé)<small>état découverte</small></label></fieldset>
      <fieldset><legend>Autres cartes</legend>${others.map(row).join('')}</fieldset>
      <div class="row">
        <button class="btn btn-sm" type="button" data-demo="all">Tout obtenir</button>
        <button class="btn btn-sm" type="button" data-demo="none">Tout retirer</button>
        <button class="btn btn-sm" type="button" data-demo="coins">+500 bobines</button>
        <button class="btn btn-sm btn-red" type="button" data-demo="reset">Réinitialiser la démo</button>
      </div>`;
  }
  function openDemo() { renderDemo(); demo.hidden = false; $('[data-demo-close]', demo).focus(); }
  function closeDemo() { demo.hidden = true; }

  /* ───────────── Parcours guidé ───────────── */
  function tour(kind) {
    if (kind === 'pack') { openPack('scifi'); return; }
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
    if ((el = q('[data-open-pack]'))) return openPack(el.dataset.openPack);
    if ((el = q('[data-tear]'))) return tearPack(el.dataset.tear);
    if ((el = q('[data-flip-all]'))) { $$('.flip:not(.flipped)', stage).forEach((b, i) => setTimeout(() => flipCard(b), i * 260)); return; }
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
      el.innerHTML = `${icon(inPl ? 'plus' : 'check')}${inPl ? 'Ajouter à ma playlist' : 'Dans ma playlist'}`;
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
      save(); renderDemo(); render();
      toast(k === 'reset' ? 'Démo réinitialisée.' : 'Collection mise à jour.');
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
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('#view .card:not(.is-unknown)');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
  window.addEventListener('hashchange', () => { if (!sheet.hidden) closeSheet(); render(); window.scrollTo(0, 0); });

  render();
})();
