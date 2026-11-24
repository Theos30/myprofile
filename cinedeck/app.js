/* CinéDeck — logique de la maquette « Croisette, épurée » (vanilla JS, sans dépendance) */
(() => {
  'use strict';
  const { CARDS, PACKS, RARITIES, RARITY_ORDER, TYPES, TYPE_ORDER } = window.CINEDECK;
  const ICONS = Object.assign({}, window.CINEDECK.ICONS, {
    arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    back: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
    skip: '<path d="M4 6v12l8-6zM12 6v12l8-6z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'
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
    return { src: imgUrl(i.still || i.photo, 'w780'), focus: i.focus || '50% 40%', alt: c.name, fallback: i.fallback ? imgUrl(i.fallback, 'w780') : '' };
  }
  // Si une image distante échoue (limite de débit), on bascule sur une photo de secours
  document.addEventListener('error', e => {
    const el = e.target;
    if (el.tagName === 'IMG' && el.dataset.fallback && el.getAttribute('src') !== el.dataset.fallback) el.src = el.dataset.fallback;
  }, true);
  function ambientOf(c) {
    const i = c.img || {};
    if (c.type === 'actor') { const f = c.filmography.map(id => byId.get(id)).find(f => filmKnown(f.id)); return f ? imgUrl(f.img.still, 'w1280') : ''; }
    return imgUrl(i.still || i.photo, i.still ? 'w1280' : '');
  }
  const ACCENT = { scifi: '#2f5d73', animation: '#b8862f', eighties: '#7a2f5b', horror: '#5c0f14', classics: '#3a3631' };

  /* ───────────── État ───────────── */
  const KEY = 'cinedeck-demo-v4';
  const START = { owned: ['marty', 'biff', 'clocktower', 'power', 'johnny', 'mjfox', 'teenwolf', 'primer', 'moon', 'planete'], discovered: [], playlist: ['power', 'johnny'], coins: 1250, attempts: {}, featured: 'scifi' };
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
  const category = () => { const pts = state.owned.length * 100 + state.discovered.length * 60; return CATS.filter(([m]) => pts >= m).pop()[1]; };

  /* ───────────── Cartes ───────────── */
  function laurel() {
    let leaves = '';
    for (let k = 0; k < 6; k++) {
      const deg = 112 + k * 24, a = deg * Math.PI / 180, x = 50 + 40 * Math.cos(a), y = 50 + 40 * Math.sin(a);
      leaves += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="2.6" transform="rotate(${deg + 70} ${x.toFixed(1)} ${y.toFixed(1)})"/><ellipse cx="${(100 - x).toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="2.6" transform="rotate(${110 - deg} ${(100 - x).toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return `<svg class="laurel" viewBox="0 0 100 100" aria-hidden="true">${leaves}</svg>`;
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
  /** opts: state, tag ('button'|'div'), cls, compact, isNew, eager */
  function cardHTML(c, opts = {}) {
    const st = opts.state || cardState(c);
    const tag = opts.tag || 'button';
    const R = RARITIES[c.rarity], im = cardImage(c);
    return `<${tag} class="card r-${c.rarity} t-${c.type} ${st === 'discovered' ? 'is-discovered' : ''} ${opts.compact ? 'compact' : ''} ${opts.cls || ''}" data-id="${c.id}" ${tag === 'button' ? 'type="button"' : ''} style="--focus:${im.focus}" aria-label="${esc(c.name)}, ${R.label}${st === 'discovered' ? ', découvert' : ''}">
      <span class="c-img"><img src="${im.src}" ${im.fallback ? `data-fallback="${im.fallback}"` : ''} alt="${esc(im.alt)}" ${opts.eager ? '' : 'loading="lazy"'} decoding="async"></span>
      <span class="c-rule"></span><span class="c-corners"></span>
      <span class="c-seal" title="${R.label}">${c.rarity === 'legendary' ? laurel() : ''}<b>${R.numeral}</b></span>
      <span class="c-cap"><span class="c-type">${TYPES[c.type].label}</span><span class="c-title">${esc(c.name)}</span><span class="c-sub">${esc(cardSub(c))}</span></span>
      <span class="c-glow"></span>
      ${opts.isNew ? '<span class="c-new">Nouveau</span>' : ''}
    </${tag}>`;
  }
  /** Carte de rangée/classeur : image seule si connue, sinon case vide */
  function slotHTML(c, label) {
    return cardState(c) === 'unknown'
      ? `<button class="slot ${label === '?' ? 'sm' : ''}" type="button" data-id="${c.id}" aria-label="${TYPES[c.type].label} non obtenu">${label}</button>`
      : cardHTML(c, { compact: true });
  }
  const rarLine = (c, cls = '') => `<span class="rar-line r-${c.rarity} ${cls}"><span class="mini-seal">${RARITIES[c.rarity].numeral}</span>${RARITIES[c.rarity].label}</span>`;
  const cardBack = () => `<span class="card-back"><span class="cb-mono">Cd</span><span class="cb-name">CinéDeck</span></span>`;
  function canHTML(p, cls = '') {
    return `<span class="can ${cls}" style="--p-accent:${ACCENT[p.id] || 'var(--rouge)'}"><span class="can-shadow"></span><span class="can-inside"></span>
      <span class="can-lid"><span class="can-label"><span class="l-brand">CinéDeck</span><span class="l-band"></span><span class="l-name">${esc(p.name)}</span></span></span></span>`;
  }

  /* ───────────── Navigation ───────────── */
  const ROUTES = [
    { id: 'packs', label: 'Accueil', icon: 'reel' },
    { id: 'collection', label: 'Collection', icon: 'grid' },
    { id: 'playlist', label: 'Bande originale', icon: 'music' },
    { id: 'profil', label: 'Profil', icon: 'user' }
  ];
  const route = () => { const h = location.hash.slice(1); return ROUTES.some(r => r.id === h) ? h : 'packs'; };
  function renderChrome() {
    const cur = route();
    $('#navbar').innerHTML = ROUTES.map(r => `<a href="#${r.id}" aria-label="${r.label}" title="${r.label}" ${r.id === cur ? 'aria-current="page"' : ''}>${icon(r.icon)}</a>`).join('')
      + `<button type="button" data-demo-open aria-label="Mode démo" title="Mode démo">${icon('sliders')}</button>`;
    $('#purse').innerHTML = `${icon('reel')}${state.coins.toLocaleString('fr-FR')}`;
    $('#purse').setAttribute('title', `${state.coins} bobines`);
  }
  function render() {
    renderChrome();
    const r = route(), v = $('#view');
    v.classList.toggle('wide', r === 'collection');
    v.innerHTML = r === 'collection' ? viewCollection() : r === 'playlist' ? viewPlaylist() : r === 'profil' ? viewProfile() : viewHome();
    renderCapsule();
  }

  /* ───────────── Accueil : une bobine, un bouton ───────────── */
  function viewHome() {
    const i = PACKS.findIndex(p => p.id === state.featured), f = PACKS[Math.max(0, i)];
    const best = f.pool.map(id => byId.get(id)).filter(c => c.type === 'film').sort((a, b) => rank(b) - rank(a)).slice(0, 5);
    return `
      <div class="home-bg" aria-hidden="true"><img src="${imgUrl(f.still, 'w1280')}" alt=""></div>
      <section class="home" aria-label="Sélection ${esc(f.name)}">
        <div class="showcase" aria-label="À gagner dans cette sélection">${best.map(c => `<img src="${imgUrl(c.img.poster, 'w185')}" alt="${esc(c.name)}" title="${esc(c.name)}">`).join('')}</div>
        <div class="can-row">
          <button class="circle-btn" type="button" data-step="-1" aria-label="Sélection précédente">${icon('left')}</button>
          <button class="can-btn home-can" type="button" data-open-pack="${f.id}" aria-label="Ouvrir une bobine ${esc(f.name)}">${canHTML(f)}</button>
          <button class="circle-btn" type="button" data-step="1" aria-label="Sélection suivante">${icon('right')}</button>
        </div>
        <div class="home-title"><h1>${esc(f.name)}</h1><span class="caps">${esc(f.edition)}</span></div>
        <div class="dots" aria-hidden="true">${PACKS.map(p => `<i class="${p.id === f.id ? 'on' : ''}"></i>`).join('')}</div>
        <button class="btn btn-red btn-wide" type="button" data-open-pack="${f.id}">Ouvrir <span class="price">${f.price}</span></button>
        <button class="link-btn" type="button" data-drawer="odds">Chances d'obtention</button>
      </section>`;
  }

  /* ───────────── Collection : un classeur numéroté ───────────── */
  function viewCollection() {
    const owned = CARDS.filter(c => isOwned(c.id)).length;
    return `
      <section class="coll">
        <h1 class="page-title">Ma collection</h1>
        <div class="counters"><span class="pill">${icon('grid')}<b>${owned}</b>/ ${CARDS.length}</span><span class="pill">${icon('film')}<b>${state.discovered.length}</b>${state.discovered.length > 1 ? 'identifiés' : 'identifié'}</span></div>
        <div class="binder">${CARDS.slice().sort((a, b) => a.no - b.no).map(c => slotHTML(c, pad(c.no))).join('')}</div>
      </section>`;
  }

  /* ───────────── Bande originale ───────────── */
  const filmLabelFor = c => filmKnown(c.film) ? byId.get(c.film).name : 'film à identifier';
  function viewPlaylist() {
    const tracks = state.playlist.map(id => byId.get(id)).filter(Boolean);
    const extra = CARDS.filter(c => c.type === 'music' && isOwned(c.id) && !state.playlist.includes(c.id));
    const locked = CARDS.filter(c => c.type === 'music' && !isOwned(c.id)).length;
    const row = (c, inList) => {
      const on = player.current === c.id && player.playing;
      return `<li class="track ${player.current === c.id ? 'is-current' : ''}">
        <span class="th"><img src="${imgUrl(c.img.still, 'w300')}" alt="" loading="lazy"></span>
        <span class="t"><b>${esc(c.name)}</b><span>${esc(c.artist)}</span></span>
        <span class="acts"><button class="circle-btn" type="button" data-play="${c.id}" aria-label="${on ? 'Arrêter' : 'Écouter'} ${esc(c.name)}">${icon(on ? 'stop' : 'play')}</button>
        ${inList ? `<button class="circle-btn" type="button" data-pl-remove="${c.id}" aria-label="Retirer">${icon('close')}</button>` : `<button class="circle-btn" type="button" data-pl-add="${c.id}" aria-label="Ajouter">${icon('plus')}</button>`}</span>
      </li>`;
    };
    return `
      <section class="bo">
        <div class="bo-head"><h1 class="page-title">Bande originale</h1>
          <button class="btn btn-ivory" type="button" data-pl-playall ${tracks.length ? '' : 'disabled'}>${icon('play')}Tout écouter</button></div>
        <ul class="tracks">${tracks.map(c => row(c, true)).join('')}${extra.map(c => row(c, false)).join('')}</ul>
        ${locked ? `<p class="hint">${plural(locked, 'musique', 'musiques')} encore à trouver</p>` : ''}
      </section>`;
  }

  /* ───────────── Profil ───────────── */
  function viewProfile() {
    const owned = state.owned.map(id => byId.get(id)).filter(Boolean);
    return `
      <section class="profile">
        <div class="avatar">T</div>
        <h1>Théo</h1>
        <p class="hint">${category()}</p>
        <div class="stats3">
          <div><b>${owned.length}</b><span>cartes</span></div>
          <div><b>${state.discovered.length}</b><span>films identifiés</span></div>
          <div><b>${owned.filter(c => c.type === 'music').length}</b><span>musiques</span></div>
        </div>
        <div class="links">
          <button class="row-link" type="button" data-drawer="rarities">Les six raretés ${icon('right')}</button>
          <button class="row-link" type="button" data-demo-open>Mode démo ${icon('right')}</button>
          <button class="row-link" type="button" data-drawer="credits">Crédits des images ${icon('right')}</button>
        </div>
      </section>`;
  }

  /* ───────────── Tiroir (feuille du bas) ───────────── */
  const drawer = $('#drawer');
  function openDrawer(key) {
    const [k, id] = key.split(':');
    const c = id && byId.get(id);
    let html = '';
    if (k === 'odds') {
      const f = packById.get(state.featured);
      html = `<h3>Chances d'obtention</h3><ul class="dlist">${RARITY_ORDER.map(r => `<li>${rarLine({ rarity: r })}<span>${RARITIES[r].odds}</span></li>`).join('')}</ul>
        <p class="note">Par carte, dans une bobine ${esc(f.name)}. La démo augmente ces taux pour montrer les cartes rares.</p>`;
    } else if (k === 'rarities') {
      html = `<h3>Les six raretés</h3><ul class="dlist">${RARITY_ORDER.map(r => `<li><span style="text-align:left">${rarLine({ rarity: r })}<small style="letter-spacing:0;text-transform:none">${RARITIES[r].desc}</small></span><span>${RARITIES[r].odds}</span></li>`).join('')}</ul>`;
    } else if (k === 'watch') {
      html = `<h3>Où regarder</h3><ul class="dlist">${c.streaming.map(s => `<li><a href="${c.watch}" target="_blank" rel="noopener"><b>${esc(s.name)}</b><span>${esc(s.kind)} ${icon('external')}</span></a></li>`).join('')}</ul><p class="note">Disponibilités d'exemple. La version finale les lira dans TMDB.</p>`;
    } else if (k === 'reviews') {
      html = `<h3>Critiques</h3><p class="big-score">${(c.tmdb.score / 10).toFixed(1).replace('.', ',')}<small> / 10</small></p><p class="note" style="margin:0 0 14px">Note des membres TMDB · ${esc(c.tmdb.votes)}</p>
        ${c.tmdb.reviews.map(r => `<blockquote class="quote"><p>« ${esc(r.text)} »</p><footer>${esc(r.author)} · ${r.rating}/10</footer></blockquote>`).join('')}<p class="note">Critiques d'exemple.</p>`;
    } else if (k === 'credits') {
      html = `<h3>Crédits des images</h3><p class="text" style="margin:0 auto;text-align:center;font-size:.98rem">Affiches, photos de plateau et portraits : <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">The Movie Database (TMDB)</a>. Cette maquette utilise des images de TMDB mais n'est ni approuvée ni certifiée par TMDB.<br><br>Photo de Puente Hills Mall : Mark Yasuda, <a href="https://commons.wikimedia.org/wiki/File:2019_Puente_Hills_Mall.jpg" target="_blank" rel="noopener">CC BY-SA 4.0, via Wikimedia Commons</a>.</p>`;
    }
    drawer.innerHTML = `<div class="drawer" role="dialog" aria-modal="true"><div class="grip"></div>${html}<div style="display:grid;justify-items:center;margin-top:18px"><button class="btn btn-sm" type="button" data-drawer-close>Fermer</button></div></div>`;
    drawer.hidden = false;
  }
  const closeDrawer = () => { drawer.hidden = true; drawer.innerHTML = ''; };

  /* ───────────── Fiche : la carte en majesté ───────────── */
  let sheetStack = [];
  const sheet = $('#sheet');
  function openCard(id, srcEl) {
    const c = byId.get(id);
    if (!c) return;
    if (cardState(c) === 'unknown') { lockedFeedback(c, srcEl); return; }
    sheetStack = [id];
    renderSheet();
    sheet.hidden = false; sheet.classList.remove('closing');
    document.body.classList.add('no-scroll');
    sheet.scrollTop = 0;
    flyIn(srcEl);
    afterSheetRender(c, true);
  }
  function pushCard(id, srcEl) {
    const c = byId.get(id);
    if (cardState(c) === 'unknown') { lockedFeedback(c, srcEl); return; }
    sheetStack.push(id);
    renderSheet(); sheet.scrollTop = 0;
    afterSheetRender(c, true);
  }
  function popCard() {
    sheetStack.pop();
    if (!sheetStack.length) return closeSheet();
    renderSheet(); afterSheetRender(byId.get(sheetStack.at(-1)), false);
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.add('closing');
    setTimeout(() => { sheet.hidden = true; sheet.innerHTML = ''; sheet.classList.remove('closing'); document.body.classList.remove('no-scroll'); render(); }, 220);
    sheetStack = [];
  }
  function lockedFeedback(c, el) {
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    toast(`À trouver dans la sélection ${c.packs.map(p => packById.get(p).name).join(' ou ')}.`);
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
    const anim = clone.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: .2 }], { duration: 550, easing: 'cubic-bezier(.3,.7,.2,1)' });
    const done = () => { clone.remove(); hero.style.visibility = ''; };
    anim.onfinish = done; anim.oncancel = done;
  }
  function renderSheet() {
    const c = byId.get(sheetStack.at(-1));
    const st = cardState(c);
    const amb = ambientOf(c);
    const body = { film: filmBody, character: characterBody, location: locationBody, music: musicBody, actor: actorBody }[c.type](c, st);
    sheet.innerHTML = `
      ${amb ? `<div class="sheet-bg ${st === 'discovered' ? 'grey' : ''}" aria-hidden="true"><img src="${amb}" alt=""></div>` : ''}
      <div class="sheet-panel">
        <div class="sheet-bar">
          ${sheetStack.length > 1 ? `<button class="circle-btn" type="button" data-back aria-label="Retour">${icon('left')}</button>` : '<span></span>'}
          <button class="circle-btn" type="button" data-close aria-label="Fermer">${icon('close')}</button>
        </div>
        <div class="detail">
          ${cardHTML(c, { tag: 'div', cls: 'hero-card', eager: true })}
          <h2 class="sr-only">${esc(c.name)}</h2>
          ${rarLine(c)}
          ${subLine(c) ? `<p class="detail-sub">${esc(subLine(c))}</p>` : ''}
          ${body}
        </div>
      </div>`;
  }
  function subLine(c) {
    if (c.type === 'film') return '';
    if (c.type === 'character') return c.actorName ? `Interprété par ${c.actorName}` : (c.actor ? `Interprété par ${byId.get(c.actor).name}` : '');
    if (c.type === 'location') return c.place;
    if (c.type === 'music') return `Sortie en ${c.year}`;
    if (c.type === 'actor') return c.born.replace(/^[^,]+, /, 'Né à ');
    return '';
  }
  const readMore = (text) => `<p class="text clamp" data-clamp>${esc(text)}</p><button class="link-btn" type="button" data-expand>Lire la suite</button>`;
  const row = (title, count, items) => `<div class="row-head"><span>${title}</span>${count ? `<em>${count}</em>` : ''}</div><div class="cardrow">${items}</div>`;

  function filmBody(c, st) {
    if (st === 'discovered') {
      return `<p class="text">Film identifié grâce à un lieu ou une musique. Obtenez sa carte pour ouvrir la fiche complète.</p>
        <button class="btn btn-red" type="button" data-open-pack="${c.packs[0]}">Ouvrir une bobine</button>`;
    }
    const trailer = c.trailer || `https://www.youtube.com/results?search_query=${encodeURIComponent(c.name + ' ' + c.year + ' bande annonce')}`;
    const acts = `<div class="actions">
      <a class="act" href="${trailer}" target="_blank" rel="noopener"><span class="circle">${icon('play', 'fill')}</span>Bande-annonce</a>
      ${c.streaming ? `<button class="act" type="button" data-drawer="watch:${c.id}"><span class="circle">${icon('tv')}</span>Où regarder</button>` : ''}
      ${c.tmdb ? `<button class="act" type="button" data-drawer="reviews:${c.id}"><span class="circle">${(c.tmdb.score / 10).toFixed(1).replace('.', ',')}</span>Critiques</button>` : ''}
    </div>`;
    if (!c.universe) return acts + readMore(c.blurb);
    const ids = ['character', 'location', 'music', 'actor'].flatMap(t => c.universe[t]);
    return acts + readMore(c.synopsis) + row('Univers du film', `${ids.filter(isOwned).length} / ${ids.length}`, ids.map(id => slotHTML(byId.get(id), '?')).join(''));
  }
  function characterBody(c) {
    const items = [slotHTML(byId.get(c.film), '?')].concat(c.actor ? [slotHTML(byId.get(c.actor), '?')] : []).join('');
    return readMore(c.desc) + row('Au générique', '', items);
  }
  function quizHTML(c) {
    const film = byId.get(c.film);
    if (filmKnown(film.id)) {
      return `<div class="quiz found" id="found">${cardHTML(film, { compact: true })}<div><span class="caps">Film identifié</span><b>${esc(film.name)}</b></div></div>`;
    }
    const tries = state.attempts[c.id] || 0;
    const hint = tries ? c.hints[Math.min(tries, c.hints.length) - 1] : '';
    return `<div class="quiz" id="guess">
      <p class="quiz-q">De quel film vient ${c.type === 'music' ? 'cette musique' : 'ce lieu'}&nbsp;?</p>
      <form data-guess="${c.id}" autocomplete="off"><label class="sr-only" for="guess-input">Titre du film</label><input id="guess-input" name="g" placeholder="Titre du film" enterkeyhint="send"><button class="btn btn-red btn-sm" type="submit">Valider</button></form>
      <p class="msg" aria-live="polite">${hint ? `Indice : ${esc(hint)}` : ''}</p>
    </div>`;
  }
  function locationBody(c) { return readMore(c.desc) + quizHTML(c); }
  function musicBody(c) {
    const on = player.current === c.id && player.playing, inPl = state.playlist.includes(c.id);
    return `<div class="player">
        <button class="circle-btn lg" type="button" data-play="${c.id}" aria-label="${on ? 'Arrêter' : 'Écouter'} l'extrait">${icon(on ? 'stop' : 'play')}</button>
        <div class="meta"><div class="prog" data-track="${c.id}"><i></i></div><button class="link-btn" type="button" data-pl-toggle="${c.id}" style="justify-self:start">${inPl ? `${icon('check')}Dans ma B.O.` : `${icon('plus')}Ajouter à ma B.O.`}</button></div>
      </div>` + quizHTML(c);
  }
  function actorBody(c) {
    const films = c.filmography.map(id => byId.get(id)).sort((a, b) => a.year - b.year);
    return readMore(c.bio) + row('Filmographie', `${films.filter(f => filmKnown(f.id)).length} / ${films.length}`, films.map(f => `<figure>${slotHTML(f, '?')}<figcaption>${f.year}</figcaption></figure>`).join(''));
  }
  function afterSheetRender(c, isFresh) {
    if (c.type === 'music' && isFresh && cardState(c) === 'owned' && !(player.current === c.id && player.playing)) playTrack(c.id);
    else loopViz();
  }

  /* ───────────── Inclinaison légère de la carte en grand ───────────── */
  document.addEventListener('pointermove', e => {
    const el = e.target.closest ? e.target.closest('.hero-card') : null;
    $$('.hero-card.is-tilting').forEach(h => { if (h !== el) { h.classList.remove('is-tilting'); h.style.removeProperty('--rx'); h.style.removeProperty('--ry'); } });
    if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.classList.add('is-tilting');
    el.style.setProperty('--rx', ((.5 - y) * 9).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  });

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
    return !!n && film.answers.some(a => { const m = norm(a); return n === m || (m.length > 8 && lev(n, m) <= 2); });
  }
  function submitGuess(form) {
    const c = byId.get(form.dataset.guess), film = byId.get(c.film), val = form.g.value;
    if (!val.trim()) { form.g.focus(); return; }
    if (isRight(val, film)) {
      if (!isDiscovered(film.id)) state.discovered.push(film.id);
      save(); renderSheet();
      const f = $('#found', sheet);
      if (f) { f.classList.add('revealing'); f.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
      afterSheetRender(c, false);
      toast(`Bien vu : « ${film.name} » rejoint votre collection, en grisé.`);
    } else {
      state.attempts[c.id] = (state.attempts[c.id] || 0) + 1;
      save(); renderSheet(); afterSheetRender(c, false);
      const g = $('#guess', sheet), msg = $('.msg', g), hint = c.hints[Math.min(state.attempts[c.id], c.hints.length) - 1];
      msg.className = 'msg bad';
      msg.textContent = `Ce n'est pas « ${val.trim()} ». Indice : ${hint}`;
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
    const ctx = new AC(), master = ctx.createGain();
    master.gain.value = .22; master.connect(ctx.destination);
    Object.assign(player, { ctx, master });
    return ctx;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(ctx, bus, { t, f, d, type, vol, cutoff }) {
    const o = ctx.createOscillator(), g = ctx.createGain(), flt = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; flt.type = 'lowpass'; flt.frequency.value = cutoff; flt.Q.value = 2;
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
    const bar = $('#capsule'), c = player.current && byId.get(player.current);
    if (!c) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = `<div class="capsule-inner">
      <span class="cap-th ${player.playing ? 'spin' : ''}"><img src="${imgUrl(c.img.still, 'w300')}" alt=""></span>
      <button class="cap-meta" type="button" data-open="${c.id}"><b>${esc(c.name)}</b><span>${esc(c.artist)}</span></button>
      <span class="cap-ctrl"><button class="circle-btn" type="button" data-play="${c.id}" aria-label="${player.playing ? 'Arrêter' : 'Écouter'}">${icon(player.playing ? 'stop' : 'play')}</button><button class="circle-btn" type="button" data-next aria-label="Titre suivant">${icon('next')}</button></span>
      <span class="cap-progress"></span></div>`;
  }

  /* ───────────── Ouverture : une carte à la fois ───────────── */
  const stage = $('#stage');
  const DEMO_WEIGHTS = { common: 30, uncommon: 25, rare: 20, epic: 14, legendary: 8, mythic: 3 };
  const run = { pack: null, pulls: [], before: null, i: 0, flipped: false, timer: 0 };
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
  function decorSVG() {
    const hy = 330, half0 = 62, H = 700, edge = (y, side) => 500 + side * (half0 + (y - hy) * (338 / (H - hy)));
    let posts = '', ropes = '';
    [-1, 1].forEach(side => {
      const pts = [372, 418, 492, 610].map(y => { const s = (y - 300) / 400; return { x: edge(y, side) + side * (14 + 40 * s), y, w: 4 + 12 * s, h: 26 + 150 * s }; });
      pts.forEach(p => { posts += `<rect x="${(p.x - p.w / 2).toFixed(1)}" y="${(p.y - p.h).toFixed(1)}" width="${p.w.toFixed(1)}" height="${p.h.toFixed(1)}" fill="url(#brass)"/><ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${(p.w * 1.6).toFixed(1)}" ry="${(p.w * .45).toFixed(1)}" fill="#8a6f3c"/><circle cx="${p.x.toFixed(1)}" cy="${(p.y - p.h - p.w * .5).toFixed(1)}" r="${(p.w * .75).toFixed(1)}" fill="url(#brass)"/>`; });
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], ya = a.y - a.h * .82, yb = b.y - b.h * .82;
        ropes += `<path d="M${a.x.toFixed(1)} ${ya.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)} ${(Math.max(ya, yb) + 18 + 30 * ((b.y - 300) / 400)).toFixed(1)} ${b.x.toFixed(1)} ${yb.toFixed(1)}" stroke="#7a1520" stroke-width="${(2 + 7 * ((b.y - 300) / 400)).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      }
    });
    return `<svg class="st-decor" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
      <linearGradient id="carpet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a070c"/><stop offset=".5" stop-color="#6e1018"/><stop offset="1" stop-color="#8e1b24"/></linearGradient>
      <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5f30"/><stop offset=".45" stop-color="#f0dcaa"/><stop offset="1" stop-color="#8a6f3c"/></linearGradient>
      <radialGradient id="pool" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffecc8" stop-opacity=".16"/><stop offset="1" stop-color="#ffecc8" stop-opacity="0"/></radialGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070605"/><stop offset="1" stop-color="#14110e"/></linearGradient></defs>
      <rect x="0" y="${hy}" width="1000" height="${H - hy}" fill="url(#floor)"/>
      <polygon points="${500 - half0},${hy} ${500 + half0},${hy} ${500 + half0 + 338},${H} ${500 - half0 - 338},${H}" fill="url(#carpet)"/>
      <ellipse cx="500" cy="420" rx="300" ry="120" fill="url(#pool)"/>${ropes}${posts}</svg>`;
  }
  function openPack(packId) {
    const pack = packById.get(packId);
    if (state.coins < pack.price) { toast('Pas assez de bobines. Ajoutez-en depuis le mode démo.'); return; }
    stopTrack(); closeDrawer();
    if (!sheet.hidden) { sheet.hidden = true; sheet.innerHTML = ''; sheetStack = []; }
    clearTimeout(run.timer);
    Object.assign(run, { pack, pulls: [], before: null, i: 0, flipped: false });
    stage.hidden = false;
    document.body.classList.add('no-scroll');
    stage.innerHTML = `${decorSVG()}<div class="st-spot"></div><canvas class="st-fx" id="dustfx"></canvas><div class="st-flashes" id="flashes"></div><div class="st-white"></div>
      <button class="circle-btn st-close" type="button" data-stage-close aria-label="Fermer">${icon('close')}</button>
      <div class="st-inner" id="st-inner"><div class="st-step">
        <span class="caps">${esc(pack.edition)}</span><p class="st-name">${esc(pack.name)}</p>
        <button class="can-btn st-can" type="button" data-tear="${pack.id}" aria-label="Ouvrir la bobine">${canHTML(pack)}</button>
        <p class="hint">Touchez la bobine pour l'ouvrir</p>
      </div></div>`;
    setupFx($('#dustfx', stage));
    $('[data-tear]', stage).focus({ preventScroll: true });
  }
  async function tearPack(packId) {
    const pack = packById.get(packId), btn = $('[data-tear]', stage);
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    state.coins -= pack.price;
    run.pulls = drawPack(pack); run.before = new Set(state.owned);
    save(); renderChrome();
    $('.hint', stage).textContent = ' ';
    const can = $('.can', btn);
    can.classList.add('opening');
    setTimeout(() => can.classList.add('open'), reduced() ? 0 : 500);
    await wait(1500);
    if (stage.hidden) return;
    showReveal(0);
  }
  function showReveal(i) {
    run.i = i; run.flipped = false;
    const c = byId.get(run.pulls[i]);
    $('#st-inner', stage).innerHTML = `<div class="reveal" data-reveal>
      <span class="reveal-count">${i + 1} / ${run.pulls.length}</span>
      <div class="reveal-slot"><div class="flip r-${c.rarity} ${rank(c) >= 3 ? 'tease' : ''}"><span class="flip-halo"></span><span class="flip-inner"><span class="face face-back">${cardBack()}</span><span class="face face-front"></span></span></div></div>
      ${rarLine(c)}
      <p class="hint">&nbsp;</p>
    </div>`;
    if (!$('.st-skip', stage)) stage.insertAdjacentHTML('beforeend', `<button class="link-btn st-skip" type="button" data-skip>Passer ${icon('skip')}</button>`);
    clearTimeout(run.timer);
    run.timer = setTimeout(flipCurrent, reduced() ? 0 : (rank(c) >= 3 ? 1300 : 700));
  }
  function flipCurrent() {
    if (run.flipped || stage.hidden) return;
    clearTimeout(run.timer);
    run.flipped = true;
    const id = run.pulls[run.i], c = byId.get(id), k = rank(c);
    setOwned(id, true); save();
    const flip = $('.flip', stage);
    $('.face-front', flip).innerHTML = cardHTML(c, { tag: 'div', isNew: !run.before.has(id), eager: true });
    flip.classList.add('flipped');
    $('.reveal .rar-line', stage).classList.add('show');
    $('.reveal .hint', stage).textContent = run.i < run.pulls.length - 1 ? 'Touchez pour la carte suivante' : 'Touchez pour terminer';
    setTimeout(() => {
      if (k >= 3) flashes({ 3: 3, 4: 6, 5: 11, 6: 16 }[k]);
      if (k >= 5) { goldRain(k === 6 ? 160 : 100); const w = $('.st-white', stage); if (w && !reduced()) { w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); } }
    }, reduced() ? 0 : 420);
    if (c.type === 'music') setTimeout(() => playTrack(id), 500);
  }
  function advance() {
    if (!run.flipped) return flipCurrent();
    if (run.i < run.pulls.length - 1) {
      const flip = $('.flip', stage);
      if (flip && !reduced()) { flip.classList.add('leave'); setTimeout(() => showReveal(run.i + 1), 330); }
      else showReveal(run.i + 1);
    } else showSummary();
  }
  function showSummary() {
    clearTimeout(run.timer);
    run.pulls.forEach(id => setOwned(id, true)); save();
    const n = run.pulls.filter(id => !run.before.has(id)).length;
    const sk = $('.st-skip', stage); if (sk) sk.remove();
    $('#st-inner', stage).innerHTML = `<div class="st-step">
      <span class="caps">${esc(run.pack.name)}</span>
      <p class="st-name">${n ? plural(n, 'nouvelle carte', 'nouvelles cartes') : 'Aucune nouveauté'}</p>
      <div class="summary">${run.pulls.map(id => cardHTML(byId.get(id), { compact: true, isNew: !run.before.has(id) })).join('')}</div>
      <div class="st-actions"><button class="btn btn-ivory" type="button" data-stage-close>Terminer</button><button class="link-btn" type="button" data-open-pack="${run.pack.id}">Ouvrir une autre bobine</button></div>
    </div>`;
    renderChrome();
  }
  function flashes(n) {
    const box = $('#flashes', stage);
    if (!box || reduced()) return;
    for (let i = 0; i < n; i++) setTimeout(() => {
      const b = document.createElement('span');
      b.className = 'bulb';
      b.style.left = (Math.random() < .5 ? Math.random() * 22 : 78 + Math.random() * 22) + '%';
      b.style.top = (35 + Math.random() * 60) + '%';
      b.style.scale = (.5 + Math.random() * .7).toFixed(2);
      box.appendChild(b); setTimeout(() => b.remove(), 450);
    }, Math.random() * (300 + n * 90));
  }
  function closeStage(rerender = true) {
    clearTimeout(run.timer);
    stage.hidden = true; stage.innerHTML = '';
    fx.parts = []; fx.ctx = null;
    document.body.classList.remove('no-scroll');
    if (rerender) render();
  }
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

  /* ───────────── Écran d'accueil ───────────── */
  function showSplash() {
    let seen = false;
    try { seen = sessionStorage.getItem('cinedeck-splash') === '1'; } catch (e) { /* ignoré */ }
    if (seen) return;
    const posters = ['interstellar', 'bttf', 'paradis', 'planete', 'rogerrabbit', 'cuckoo', 'lucioles', 'nightdead'];
    const spots = [[6, 8, -7], [70, 6, 6], [-4, 40, 5], [76, 40, -5], [10, 72, 4], [64, 74, -6], [36, -6, 3], [40, 86, -3]];
    const el = $('#splash');
    el.innerHTML = `<div class="splash-cards" aria-hidden="true">${posters.map((id, i) => `<img src="${imgUrl(byId.get(id).img.poster, 'w342')}" alt="" style="left:${spots[i][0]}%;top:${spots[i][1]}%;width:clamp(90px,22vw,200px);rotate:${spots[i][2]}deg;animation-delay:-${i * 1.7}s">`).join('')}</div>
      <div class="splash-center"><b>CinéDeck</b><span class="caps">Cinémathèque à collectionner</span></div>
      <p class="splash-tap">Touchez pour commencer</p><p class="splash-credit">Images : TMDB</p>`;
    el.hidden = false;
    el.addEventListener('click', () => {
      try { sessionStorage.setItem('cinedeck-splash', '1'); } catch (e) { /* ignoré */ }
      el.classList.add('out'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, reduced() ? 0 : 600);
    }, { once: true });
  }

  /* ───────────── Mode démo ───────────── */
  const demo = $('#demo');
  function renderDemo() {
    const universe = ['bttf', ...['character', 'location', 'music', 'actor'].flatMap(t => byId.get('bttf').universe[t])];
    const others = CARDS.filter(c => !universe.includes(c.id));
    const rowL = c => `<label><input type="checkbox" data-own="${c.id}" ${isOwned(c.id) ? 'checked' : ''}>${esc(c.name)}<small>${TYPES[c.type].label}<br>${RARITIES[c.rarity].label}</small></label>`;
    demo.innerHTML = `
      <header><div><span class="caps">Maquette</span><h3>Mode démo</h3></div><button class="circle-btn" type="button" data-demo-close aria-label="Fermer">${icon('close')}</button></header>
      <fieldset><legend>Raccourcis</legend><div class="tours">
        ${[['pack', 'Ouvrir une bobine'], ['film', 'Fiche film complète'], ['location', 'Deviner le film d\'un lieu'], ['music', 'Révéler une musique'], ['actor', 'Filmographie d\'un acteur']].map(([k, t]) => `<button type="button" data-tour="${k}">${t}${icon('right')}</button>`).join('')}
      </div></fieldset>
      <fieldset><legend>Univers Retour vers le futur</legend>${universe.map(id => rowL(byId.get(id))).join('')}
        <label><input type="checkbox" data-disc="bttf" ${isDiscovered('bttf') ? 'checked' : ''}>Film identifié<small>état<br>découverte</small></label></fieldset>
      <fieldset><legend>Autres cartes</legend>${others.map(rowL).join('')}</fieldset>
      <div class="row">
        <button class="btn btn-sm" type="button" data-demo="all">Tout obtenir</button>
        <button class="btn btn-sm" type="button" data-demo="none">Tout retirer</button>
        <button class="btn btn-sm" type="button" data-demo="coins">+ 500 bobines</button>
        <button class="btn btn-sm btn-red" type="button" data-demo="reset">Réinitialiser</button>
      </div>`;
  }
  function openDemo() { renderDemo(); demo.hidden = false; $('[data-demo-close]', demo).focus(); }
  function closeDemo() { demo.hidden = true; }
  function tour(kind) {
    closeDemo();
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
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3400);
  }

  /* ───────────── Événements ───────────── */
  document.addEventListener('click', e => {
    const t = e.target, q = s => t.closest(s);
    let el;
    if ((el = q('[data-tour]'))) return tour(el.dataset.tour);
    if ((el = q('[data-step]'))) {
      const i = PACKS.findIndex(p => p.id === state.featured);
      state.featured = PACKS[(i + Number(el.dataset.step) + PACKS.length) % PACKS.length].id;
      save(); render();
      const can = $('.home-can'); if (can && !reduced()) can.animate([{ opacity: 0, transform: `translateX(${Number(el.dataset.step) * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
      return;
    }
    if ((el = q('[data-drawer-close]')) || t === drawer) return closeDrawer();
    if ((el = q('[data-drawer]'))) return openDrawer(el.dataset.drawer);
    if ((el = q('[data-open-pack]'))) return openPack(el.dataset.openPack);
    if ((el = q('[data-tear]'))) return tearPack(el.dataset.tear);
    if ((el = q('[data-skip]'))) return showSummary();
    if ((el = q('[data-stage-close]'))) return closeStage();
    if (!stage.hidden && (el = q('button.card[data-id]'))) { closeStage(false); return setTimeout(() => openCard(el.dataset.id, null), 50); }
    if ((el = q('[data-reveal]'))) return advance();
    if ((el = q('[data-play]'))) { e.preventDefault(); return togglePlay(el.dataset.play, { queue: route() === 'playlist' && sheet.hidden && state.playlist.includes(el.dataset.play) }); }
    if ((el = q('[data-next]'))) return nextTrack();
    if ((el = q('[data-pl-playall]'))) return state.playlist.length && playTrack(state.playlist[0], { queue: true });
    if ((el = q('[data-pl-add]'))) { state.playlist.push(el.dataset.plAdd); save(); return render(); }
    if ((el = q('[data-pl-remove]'))) { state.playlist = state.playlist.filter(x => x !== el.dataset.plRemove); save(); return render(); }
    if ((el = q('[data-pl-toggle]'))) {
      const id = el.dataset.plToggle, inPl = state.playlist.includes(id);
      state.playlist = inPl ? state.playlist.filter(x => x !== id) : [...state.playlist, id];
      save();
      el.innerHTML = inPl ? `${icon('plus')}Ajouter à ma B.O.` : `${icon('check')}Dans ma B.O.`;
      return;
    }
    if ((el = q('[data-expand]'))) { const p = el.previousElementSibling; p.classList.remove('clamp'); el.remove(); return; }
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
      save(); renderDemo(); render();
      toast(k === 'reset' ? 'Démo réinitialisée.' : k === 'coins' ? '500 bobines ajoutées.' : 'Collection mise à jour.');
      return;
    }
    if ((el = q('button.card[data-id], button.slot[data-id]'))) {
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
  });
  document.addEventListener('submit', e => { const f = e.target.closest('[data-guess]'); if (f) { e.preventDefault(); submitGuess(f); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!drawer.hidden) return closeDrawer();
    if (!demo.hidden) return closeDemo();
    if (!stage.hidden) return closeStage();
    if (!sheet.hidden) return sheetStack.length > 1 ? popCard() : closeSheet();
  });
  window.addEventListener('hashchange', () => { if (!sheet.hidden) closeSheet(); render(); window.scrollTo(0, 0); });

  render();
  showSplash();
})();
