/*
 * CinéDeck — données de la maquette.
 * Images : chemins TMDB (https://image.tmdb.org/t/p/{taille}{chemin}) et une photo Wikimedia Commons.
 * Cette maquette utilise des images de TMDB mais n'est ni approuvée ni certifiée par TMDB.
 * Les notes, critiques et disponibilités streaming sont des exemples.
 */
window.CINEDECK = (() => {
  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const RARITIES = {
    common:    { label: 'Séance',         numeral: 'I',   rank: 1, odds: '60 %',  desc: 'Films confidentiels, pépites à découvrir, seconds rôles.' },
    uncommon:  { label: 'Sélection',      numeral: 'II',  rank: 2, odds: '25 %',  desc: 'Films salués par les cinéphiles, personnages secondaires.' },
    rare:      { label: 'Avant-première', numeral: 'III', rank: 3, odds: '10 %',  desc: 'Succès populaires et lieux de tournage marquants.' },
    epic:      { label: 'Gala',           numeral: 'IV',  rank: 4, odds: '4 %',   desc: 'Grands classiques, héros et musiques cultes.' },
    legendary: { label: 'Prestige',       numeral: 'V',   rank: 5, odds: '0,9 %', desc: 'Monuments du cinéma et figures iconiques.' },
    mythic:    { label: 'Légende',        numeral: 'VI',  rank: 6, odds: '0,1 %', desc: 'Légendes vivantes du septième art. Tirage exceptionnel.' }
  };

  const TYPE_ORDER = ['film', 'character', 'location', 'music', 'actor'];
  const TYPES = {
    film:      { label: 'Film',       plural: 'Films' },
    character: { label: 'Personnage', plural: 'Personnages' },
    location:  { label: 'Lieu',       plural: 'Lieux' },
    music:     { label: 'Musique',    plural: 'Musiques' },
    actor:     { label: 'Acteur',     plural: 'Acteurs' }
  };

  const ICONS = {
    film: '<rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M3 9 4.6 4.2l15.6 0L21 9M8.6 4.2 7.4 9M14 4.2 12.8 9M19.3 4.2 18.2 9"/>',
    character: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.6 4.4-7 8-7s7 2.4 8 7"/>',
    location: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    actor: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/>',
    next: '<path d="M5 5v14l10-7zM18 5v14" />',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
    reel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="6.5" r="2"/><circle cx="12" cy="17.5" r="2"/><circle cx="6.5" cy="12" r="2"/><circle cx="17.5" cy="12" r="2"/>',
    packs: '<path d="M6 3h12l-1 3 1 3-1 3 1 3-1 3 1 3H6l1-3-1-3 1-3-1-3 1-3z"/>',
    grid: '<rect x="4" y="4" width="7" height="9" rx="1"/><rect x="13" y="4" width="7" height="9" rx="1"/><rect x="4" y="15" width="7" height="5" rx="1"/><rect x="13" y="15" width="7" height="5" rx="1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.6 4.4-7 8-7s7 2.4 8 7"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    planet: '<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10.5" ry="3.4" transform="rotate(-20 12 12)"/>',
    pencil: '<path d="M4 20l4.2-1L19.5 7.7 16.3 4.5 5 15.8z"/><path d="M14 6.8l3.2 3.2"/>',
    cassette: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8.5" cy="11.5" r="2"/><circle cx="15.5" cy="11.5" r="2"/><path d="M10.5 11.5h3M7 18l1.6-2.6h6.8L17 18"/>',
    crescent: '<path d="M15.5 3.2a9 9 0 1 0 5.6 12.6A7.2 7.2 0 0 1 15.5 3.2z"/>',
    camera: '<rect x="3" y="10" width="12" height="9" rx="1.5"/><path d="M15 13l6-3v9l-6-3"/><circle cx="6.5" cy="6.5" r="2.6"/><circle cx="12.2" cy="6.5" r="2.6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };

  const BTTF_ANSWERS = ['Retour vers le futur', 'Back to the Future', 'Retour vers le futur 1'];

  const CARDS = [
    /* ───────────── Film vedette ───────────── */
    {
      id: 'bttf', img: { poster: '/iCgFtDUZxN8iUzNBCisjUrBmg2q.jpg', still: '/n8nfl8Fuk4d30ZsNTGmWEVdZlk3.jpg' }, type: 'film', rarity: 'legendary',
      name: 'Retour vers le futur', original: 'Back to the Future', year: 1985,
      director: 'Robert Zemeckis', writers: 'Robert Zemeckis, Bob Gale',
      duration: '1 h 56', genres: ['Science-fiction', 'Aventure', 'Comédie'],
      synopsis: "Hill Valley, 1985. Marty McFly, lycéen fan de rock, est l'ami d'un savant excentrique, le Doc Emmett Brown, qui a transformé une DeLorean en machine à voyager dans le temps. Une nuit, l'expérience tourne mal et Marty se retrouve propulsé en 1955. Il croise ses futurs parents adolescents… et empêche sans le vouloir leur rencontre. Il a une semaine pour réparer le passé et rentrer chez lui avant de s'effacer de sa propre photo de famille.",
      tmdb: {
        score: 83, votes: '≈ 20 000 votes',
        reviews: [
          { author: 'cinephile_88', rating: 9, text: "Un scénario d'horloger : chaque détail planté dans la première demi-heure paie plus tard." },
          { author: 'Lumière & Co', rating: 8, text: "Le duo Marty / Doc fonctionne toujours, et le rythme n'a pas pris une ride." },
          { author: 'popcorn.club', rating: 9, text: "La scène de l'horloge sous l'orage reste un sommet de suspense familial." }
        ]
      },
      streaming: [
        { name: 'Netflix', kind: 'Abonnement' },
        { name: 'Prime Video', kind: 'Location' },
        { name: 'Canal+', kind: 'Abonnement' },
        { name: 'Apple TV', kind: 'Achat' }
      ],
      trailer: 'https://www.youtube.com/results?search_query=retour+vers+le+futur+bande+annonce',
      watch: 'https://www.justwatch.com/fr/recherche?q=retour%20vers%20le%20futur',
      answers: BTTF_ANSWERS,
      universe: {
        character: ['marty', 'doc', 'biff', 'lorraine'],
        location: ['clocktower', 'twinpines'],
        music: ['theme', 'power', 'johnny'],
        actor: ['mjfox', 'lloyd']
      },
      art: ['#ff7b2e', '#2a1452', '#ffd166'], packs: ['scifi', 'eighties']
    },

    /* ───────────── Personnages ───────────── */
    {
      id: 'marty', img: { still: '/7dX04kKxoMvawwanCAZev4xM4Km.jpg', focus: '46% 30%' }, type: 'character', rarity: 'epic', name: 'Marty McFly', film: 'bttf', actor: 'mjfox',
      desc: "Lycéen de 17 ans, guitariste et skateur, coincé en 1955 par accident. Débrouillard et têtu, il ne supporte pas qu'on le traite de mauviette.",
      facts: [['Époque', '1985 → 1955'], ['Passion', 'Guitare électrique'], ['Signe distinctif', 'Doudoune sans manches rouge']],
      art: ['#e63946', '#1d1135', '#ffb703'], packs: ['scifi', 'eighties']
    },
    {
      id: 'doc', img: { still: '/z6CvKSlJciRPgagU49T2Dj6nLrS.jpg', focus: '24% 30%' }, type: 'character', rarity: 'legendary', name: 'Doc Brown', fullName: 'Dr Emmett Brown', film: 'bttf', actor: 'lloyd',
      desc: "Inventeur génial et un peu fou. Il a imaginé le convecteur temporel en se cognant la tête un jour de 1955.",
      facts: [['Invention', 'Convecteur temporel'], ['Énergie requise', '1,21 gigawatt'], ['Compagnon', 'Einstein, son chien']],
      art: ['#8ecae6', '#1b263b', '#f1faee'], packs: ['scifi', 'eighties']
    },
    {
      id: 'biff', img: { still: '/cnBL7SIhpWmZCyIaM6Yiz9Lyr7a.jpg', focus: '50% 25%' }, type: 'character', rarity: 'rare', name: 'Biff Tannen', film: 'bttf', actorName: 'Thomas F. Wilson',
      desc: "La brute du lycée de Hill Valley, en 1955 comme en 1985. Il martyrise George McFly depuis l'adolescence.",
      facts: [['Rôle', 'Antagoniste'], ['Voiture', 'Ford décapotable noire'], ['Point faible', 'Le fumier']],
      art: ['#6a994e', '#1a1a1a', '#bc4749'], packs: ['scifi', 'eighties']
    },
    {
      id: 'lorraine', img: { still: '/lNAVFTVgYJHxwvsiKk6AUolUL8I.jpg', focus: '20% 30%' }, type: 'character', rarity: 'uncommon', name: 'Lorraine Baines', film: 'bttf', actorName: 'Lea Thompson',
      desc: "La mère de Marty. En 1955, adolescente, elle tombe sous le charme du mystérieux nouveau venu… son propre fils.",
      facts: [['Époque', '1955'], ['Nom marital', 'Lorraine McFly'], ['Rêve', 'Aller au bal du lycée']],
      art: ['#f4a6c1', '#3d1f3a', '#ffe5ec'], packs: ['scifi', 'eighties']
    },

    /* ───────────── Lieux ───────────── */
    {
      id: 'clocktower', img: { still: '/uBpgDbSqBPBiYElbpsEcPkgvuBP.jpg', focus: '48% 40%' }, type: 'location', rarity: 'epic', name: "Tour de l'horloge", place: 'Palais de justice de Hill Valley', film: 'bttf',
      desc: "Son horloge s'est figée à 22 h 04, le soir où la foudre l'a frappée en novembre 1955. Le parvis devient le théâtre d'une course contre la montre.",
      shooting: 'Courthouse Square, studios Universal, Los Angeles (Californie)',
      coords: '34.14° N · 118.35° W',
      hints: ['Le film est sorti en 1985.', 'Une voiture y devient une machine à remonter le temps.', 'Le héros s\'appelle Marty.'],
      art: ['#3a86ff', '#0b132b', '#ffbe0b'], packs: ['scifi', 'eighties']
    },
    {
      id: 'twinpines', img: { photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/2019_Puente_Hills_Mall.jpg/960px-2019_Puente_Hills_Mall.jpg', focus: '58% 50%', credit: 'Photo : Mark Yasuda, CC BY-SA 4.0, via Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:2019_Puente_Hills_Mall.jpg' }, type: 'location', rarity: 'rare', name: 'Twin Pines Mall', place: 'Parking du centre commercial', film: 'bttf',
      desc: "Un parking désert à 1 h 15 du matin. Le lieu choisi pour une démonstration scientifique qui va changer l'histoire.",
      shooting: 'Puente Hills Mall, City of Industry (Californie)',
      coords: '34.03° N · 117.93° W',
      hints: ['Le film est sorti en 1985.', 'On y atteint 88 miles à l\'heure.', 'Le héros s\'appelle Marty.'],
      art: ['#7209b7', '#10002b', '#4cc9f0'], packs: ['scifi', 'eighties']
    },

    /* ───────────── Musiques ───────────── */
    {
      id: 'theme', img: { still: '/877f7BJivcS7Gz13WnHxMI1sSD7.jpg', focus: '50% 50%' }, type: 'music', rarity: 'legendary', name: 'Thème principal', artist: 'Alan Silvestri', role: 'Musique originale', year: 1985, film: 'bttf',
      desc: "Une fanfare orchestrale devenue l'un des thèmes les plus reconnaissables des années 80.",
      hints: ['Composée en 1985.', 'Elle accompagne une DeLorean lancée à pleine vitesse.', 'Le héros s\'appelle Marty.'],
      motif: { bpm: 112, wave: 'sawtooth', root: 60, cutoff: 1800,
        seq: [0, 7, 12, 16, 14, 12, 7, 9, 7, 4, 5, 7, 12, null, 7, null, 0, 7, 12, 17, 16, 14, 12, 11, 12, null, 16, null, 19, null, null, null],
        bass: [0, 0, -3, -3, -7, -7, -5, -5] },
      art: ['#ffb703', '#3c096c', '#fb8500'], packs: ['scifi', 'eighties']
    },
    {
      id: 'power', img: { still: '/sIDzfBgV1KuCb1qmqRax1KJm7oi.jpg', focus: '36% 35%' }, type: 'music', rarity: 'epic', name: 'The Power of Love', artist: 'Huey Lewis and the News', role: 'Chanson originale', year: 1985, film: 'bttf',
      desc: "Single écrit pour le film, numéro 1 du Billboard Hot 100 à l'été 1985 et nommé à l'Oscar de la meilleure chanson.",
      hints: ['Sortie en 1985.', 'On l\'entend quand le héros file en skate vers le lycée.', 'Le héros s\'appelle Marty.'],
      motif: { bpm: 120, wave: 'square', root: 57, cutoff: 2400,
        seq: [0, 0, 3, 5, 0, 7, 5, 3, 0, 0, 3, 5, 7, 5, 3, null, 5, 5, 8, 10, 5, 12, 10, 8, 7, null, 7, 5, 3, null, 0, null],
        bass: [0, 0, 5, 5, 3, 3, -2, -2] },
      art: ['#ef233c', '#2b2d42', '#edf2f4'], packs: ['scifi', 'eighties']
    },
    {
      id: 'johnny', img: { still: '/1s7ix9iyYVIuIsj8vYasQYJjFuz.jpg', focus: '52% 35%' }, type: 'music', rarity: 'rare', name: 'Johnny B. Goode', artist: 'Chuck Berry', role: 'Reprise sur scène', year: 1958, film: 'bttf',
      desc: "Le classique rock'n'roll de 1958, joué par le héros sur la scène d'un bal de lycée… trois ans avant sa sortie.",
      hints: ['Le film se déroule en partie en 1955.', 'Le héros joue de la guitare au bal de ses parents.', 'Le héros s\'appelle Marty.'],
      motif: { bpm: 168, wave: 'triangle', root: 64, cutoff: 3200,
        seq: [0, 4, 7, 9, 10, 9, 7, 4, 0, 4, 7, 9, 10, 9, 7, 4, 5, 9, 12, 14, 15, 14, 12, 9, 0, 4, 7, 9, 10, 9, 7, 4],
        bass: [0, 0, 0, 0, 5, 5, 0, 0] },
      art: ['#06d6a0', '#073b4c', '#ffd166'], packs: ['eighties']
    },

    /* ───────────── Acteurs ───────────── */
    {
      id: 'mjfox', img: { profile: '/2JB4FMgQmnhbBlQ4SxWFN9EIVDi.jpg', focus: '50% 25%' }, type: 'actor', rarity: 'mythic', name: 'Michael J. Fox', born: '9 juin 1961, Edmonton (Canada)',
      bio: "Révélé à la télévision par la série Sacrée Famille, il devient une star mondiale en 1985 avec Retour vers le futur. Diagnostiqué de la maladie de Parkinson en 1991, il crée en 2000 une fondation qui est devenue l'un des premiers financeurs privés de la recherche sur cette maladie.",
      filmography: ['bttf', 'teenwolf', 'secret', 'bttf2', 'dochollywood', 'marsattacks'],
      characters: ['marty'],
      art: ['#ff006e', '#14082b', '#ffbe0b'], packs: ['scifi', 'eighties']
    },
    {
      id: 'lloyd', img: { profile: '/nxVjpyb3UrfbPZnEyDNlQVlFAs5.jpg', focus: '50% 25%' }, type: 'actor', rarity: 'epic', name: 'Christopher Lloyd', born: '22 octobre 1938, Stamford (Connecticut)',
      bio: "Formé au théâtre à New York, il se fait remarquer dans Vol au-dessus d'un nid de coucou puis dans la série Taxi. Son Doc Brown aux cheveux fous en fait un visage culte du cinéma populaire.",
      filmography: ['cuckoo', 'bttf', 'rogerrabbit', 'bttf2', 'addams'],
      characters: ['doc'],
      art: ['#4cc9f0', '#0d1b2a', '#e0fbfc'], packs: ['scifi', 'eighties']
    },

    /* ───────────── Autres films (fiches courtes) ───────────── */
    { id: 'bttf2', img: { poster: '/pvSf95zo0GZNp83QCtmK1GFLHtT.jpg', still: '/w6tPctxWAsHoQXeKxxNOT6lYKpx.jpg' }, type: 'film', rarity: 'epic', name: 'Retour vers le futur II', year: 1989, director: 'Robert Zemeckis',
      blurb: "Marty et le Doc filent en 2015, puis découvrent un 1985 parallèle dominé par Biff.", art: ['#00b4d8', '#03045e', '#f72585'], packs: ['scifi', 'eighties'] },
    { id: 'teenwolf', img: { poster: '/kfcQigVoWwCFBmOGh8IfHoOe7S4.jpg', still: '/d1RYJQcljAlSOwTizaGS3oWnPEk.jpg' }, type: 'film', rarity: 'common', name: 'Teen Wolf', year: 1985, director: 'Rod Daniel',
      blurb: "Un lycéen découvre qu'il se transforme en loup-garou… et devient la star de l'équipe de basket.", art: ['#9c6644', '#1b1b1b', '#ddb892'], packs: ['eighties', 'horror'] },
    { id: 'secret', img: { poster: '/3wVMShcKm0x9fdRjWYgpUiSJPXx.jpg', still: '/tqm00kwclq6nibl7u9De8u3cq0X.jpg' }, type: 'film', rarity: 'uncommon', name: 'Le Secret de mon succès', year: 1987, director: 'Herbert Ross',
      blurb: "Un jeune diplômé du Kansas grimpe les échelons d'une multinationale new-yorkaise en menant une double vie.", art: ['#90be6d', '#1d3557', '#f9c74f'], packs: ['eighties'] },
    { id: 'dochollywood', img: { poster: '/z6FaMpzc3MkfPqyIb4FNEBqz3KI.jpg', still: '/9Vp4761sywoBOdHOjGN1a6pFk61.jpg' }, type: 'film', rarity: 'common', name: 'Doc Hollywood', year: 1991, director: 'Michael Caton-Jones',
      blurb: "Un chirurgien en route pour Beverly Hills est condamné à exercer dans une petite ville du Sud.", art: ['#f4a261', '#264653', '#e9c46a'], packs: ['classics'] },
    { id: 'marsattacks', img: { poster: '/ljW8CVhjhoJNrMor6pIQLM3Mhqr.jpg', still: '/ELsTifJ2lu4vsMhoHeZ5EnncHw.jpg' }, type: 'film', rarity: 'rare', name: 'Mars Attacks!', year: 1996, director: 'Tim Burton',
      blurb: "Les Martiens débarquent sur Terre, et ils ne viennent pas en paix.", art: ['#70e000', '#10002b', '#ff0a54'], packs: ['scifi'] },
    { id: 'cuckoo', img: { poster: '/r5b2ub7GMawCWDP5vHR1MXpV7vU.jpg', still: '/5hll0hYssHbJiKxFcsQQLL7BhSP.jpg' }, type: 'film', rarity: 'legendary', name: "Vol au-dessus d'un nid de coucou", year: 1975, director: 'Miloš Forman',
      blurb: "Un détenu se fait interner pour échapper à la prison et défie l'infirmière en chef.", art: ['#adb5bd', '#212529', '#e9ecef'], packs: ['classics'] },
    { id: 'rogerrabbit', img: { poster: '/fJ1wJ9avrGj9VViC94CcRKL8N7w.jpg', still: '/udIE8Cdon9wnYmVIOFYrBPfA2Mq.jpg' }, type: 'film', rarity: 'epic', name: 'Qui veut la peau de Roger Rabbit', year: 1988, director: 'Robert Zemeckis',
      blurb: "Un détective privé enquête dans un Hollywood où humains et toons cohabitent.", art: ['#e63946', '#14213d', '#fca311'], packs: ['animation', 'eighties'] },
    { id: 'addams', img: { poster: '/l2mq3aWw1ze6NsnwEWSWviziWvo.jpg', still: '/7OxGhxUYAdtuike29VMzEFxJx7y.jpg' }, type: 'film', rarity: 'rare', name: 'La Famille Addams', year: 1991, director: 'Barry Sonnenfeld',
      blurb: "Un imposteur se fait passer pour l'oncle Fétide afin de dérober la fortune de la famille.", art: ['#5a189a', '#0b090a', '#c77dff'], packs: ['horror'] },
    { id: 'primer', img: { poster: '/92XglEsC6pnhBt1pxJYRFNRgs4F.jpg', still: '/blSQbKAreIqcu2AWGDNjR8k3fAy.jpg' }, type: 'film', rarity: 'common', name: 'Primer', year: 2004, director: 'Shane Carruth',
      blurb: "Deux ingénieurs découvrent par accident, dans leur garage, un moyen de voyager dans le temps.", art: ['#6c757d', '#0b0c10', '#c5c6c7'], packs: ['scifi'] },
    { id: 'moon', img: { poster: '/6S34vVOl2MzdIDpb1tpLACLLdBJ.jpg', still: '/mvUAo9ACgmLpS4Ofc2IwD4n7WCt.jpg' }, type: 'film', rarity: 'uncommon', name: 'Moon', year: 2009, director: 'Duncan Jones',
      blurb: "Seul sur une base lunaire, un technicien voit sa fin de contrat approcher… et doute de tout.", art: ['#d6d6d6', '#111111', '#ff4d00'], packs: ['scifi'] },
    { id: 'interstellar', img: { poster: '/1pnigkWWy8W032o9TKDneBa3eVK.jpg', still: '/8sNiAPPYU14PUepFNeSNGUTiHW.jpg' }, type: 'film', rarity: 'legendary', name: 'Interstellar', year: 2014, director: 'Christopher Nolan',
      blurb: "Des explorateurs traversent un trou de ver pour trouver une nouvelle planète habitable.", art: ['#caf0f8', '#03071e', '#ffba08'], packs: ['scifi'] },
    { id: 'planete', img: { poster: '/jOxKv64pJtybPj5wkhE7wYBImvS.jpg', still: '/AwrqoanoZVYoc0MRyE0RiHEKm71.jpg' }, type: 'film', rarity: 'rare', name: 'La Planète sauvage', year: 1973, director: 'René Laloux',
      blurb: "Sur une planète étrangère, les minuscules Oms se révoltent contre les géants Draags.", art: ['#48cae4', '#023e8a', '#ff6d00'], packs: ['animation', 'scifi'] },
    { id: 'roioiseau', img: { poster: '/8LlM0gtrwmzmf9z9RvhWvOOl2WE.jpg', still: '/pSL75Sg1APD4OHpQs4VyFb8pIFv.jpg' }, type: 'film', rarity: 'uncommon', name: "Le Roi et l'Oiseau", year: 1980, director: 'Paul Grimault',
      blurb: "Un oiseau malicieux défie un roi tyrannique pour sauver deux amoureux.", art: ['#ffd60a', '#003566', '#ef476f'], packs: ['animation', 'classics'] },
    { id: 'lucioles', img: { poster: '/o9yJxxHEkeJQRIbBex4q7zy3LzZ.jpg', still: '/aHaqZpOL7UyVu0nKqp3SMz0o2E1.jpg' }, type: 'film', rarity: 'epic', name: 'Le Tombeau des lucioles', year: 1988, director: 'Isao Takahata',
      blurb: "Deux enfants tentent de survivre au Japon à la fin de la Seconde Guerre mondiale.", art: ['#fb8500', '#1a0f05', '#ffe8a3'], packs: ['animation'] },
    { id: 'carnival', img: { poster: '/1cv0s5MdpW1UyoCD4mlgAJtIPFN.jpg', still: '/esIoQw7VaykfHsw6fx2VltZ1R7U.jpg' }, type: 'film', rarity: 'common', name: 'Carnival of Souls', year: 1962, director: 'Herk Harvey',
      blurb: "Après un accident, une organiste est hantée par une silhouette blafarde.", art: ['#8d99ae', '#0a0a0a', '#edf2f4'], packs: ['horror'] },
    { id: 'nightdead', img: { poster: '/lX5cA957idlD9Muke5kxZ9V6Rsf.jpg', still: '/5KtmBSqFtHY3I9t8lgH27Mc0bqY.jpg' }, type: 'film', rarity: 'rare', name: 'La Nuit des morts-vivants', year: 1968, director: 'George A. Romero',
      blurb: "Des inconnus barricadés dans une ferme affrontent des morts revenus à la vie.", art: ['#9d0208', '#0b0b0b', '#dee2e6'], packs: ['horror', 'classics'] },
    { id: 'paradis', img: { poster: '/pmYOsWz9F7qNQaT9MNe0n0JKsR4.jpg', still: '/ubERa5VEJlBRglxDSBSL0YBG7XB.jpg' }, type: 'film', rarity: 'rare', name: 'Les Enfants du paradis', year: 1945, director: 'Marcel Carné',
      blurb: "Dans le Paris des théâtres du XIXe siècle, quatre hommes aiment la même femme.", art: ['#e9d8a6', '#3d2c2e', '#bb3e03'], packs: ['classics'] }
  ];

  const PACKS = [
    { id: 'scifi', still: '/n8nfl8Fuk4d30ZsNTGmWEVdZlk3.jpg', emblem: 'planet', name: 'Science-Fiction', edition: 'Paradoxes temporels', price: 100,
      colors: ['#0f4c5c', '#e36414', '#ffd166'], featured: true,
      desc: 'Voyages dans le temps, savants fous et planètes lointaines. Contient tout l\'univers de Retour vers le futur.' },
    { id: 'animation', still: '/AwrqoanoZVYoc0MRyE0RiHEKm71.jpg', emblem: 'pencil', name: 'Animation', edition: 'Crayons & celluloïd', price: 100,
      colors: ['#023e8a', '#48cae4', '#ffd60a'],
      desc: 'Du papier découpé français à l\'animation japonaise.' },
    { id: 'eighties', still: '/w6tPctxWAsHoQXeKxxNOT6lYKpx.jpg', emblem: 'cassette', name: 'Années 80', edition: 'VHS & néons', price: 120,
      colors: ['#7209b7', '#f72585', '#4cc9f0'],
      desc: 'Synthés, skateboards et blockbusters de vidéoclub.' },
    { id: 'horror', still: '/5KtmBSqFtHY3I9t8lgH27Mc0bqY.jpg', emblem: 'crescent', name: 'Frissons', edition: 'Minuit au drive-in', price: 100,
      colors: ['#2b0a0a', '#9d0208', '#dee2e6'],
      desc: 'Morts-vivants, loups-garous et familles inquiétantes.' },
    { id: 'classics', still: '/ubERa5VEJlBRglxDSBSL0YBG7XB.jpg', emblem: 'camera', name: 'Classiques', edition: 'Noir & blanc', price: 150,
      colors: ['#1c1c1c', '#6c757d', '#e9d8a6'],
      desc: 'Les films qui ont écrit l\'histoire du cinéma.' }
  ];

  PACKS.forEach(p => { p.pool = CARDS.filter(c => c.packs.includes(p.id)).map(c => c.id); });
  CARDS.forEach((c, i) => {
    c.no = i + 1;
    if (c.type === 'film' && !c.answers) c.answers = [c.name];
  });

  return { RARITIES, RARITY_ORDER, TYPES, TYPE_ORDER, ICONS, CARDS, PACKS };
})();
