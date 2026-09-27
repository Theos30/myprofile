// Données de l'app. Les listes "…_SAMPLE" et les événements servent d'exemples
// quand les sources en direct ne répondent pas (hors ligne, réseau filtré).

const CATEGORIES = {
  patrimoine: { label: "Patrimoine", icon: "landmark", color: "var(--blue)" },
  culture:    { label: "Culture",    icon: "palette",  color: "var(--sky)" },
  resto:      { label: "Restos",     icon: "utensils", color: "var(--red)" },
  nature:     { label: "Plein air",  icon: "tree",     color: "var(--green)" },
  sport:      { label: "Sport",      icon: "trophy",   color: "var(--orange)" },
  shopping:   { label: "Commerces",  icon: "bag",      color: "var(--yellow-deep)" },
};

const PLACES = [
  {
    id: "gare", name: "Gare des Bénédictins", cat: "patrimoine", photo: true,
    lat: 45.8363, lng: 1.2680, rating: 4.8, reviews: 312,
    desc: "Inaugurée en 1929, son campanile Art déco est l'un des symboles de Limoges et régulièrement citée parmi les plus belles gares de France.",
    tags: ["Art déco", "Incontournable"],
  },
  {
    id: "cathedrale", name: "Cathédrale Saint-Étienne", cat: "patrimoine",
    lat: 45.8285, lng: 1.2672, rating: 4.7, reviews: 204,
    desc: "Cathédrale gothique dont la construction s'est étalée sur six siècles, avec son remarquable jubé Renaissance.",
    tags: ["Gothique", "Visite libre"],
  },
  {
    id: "boucherie", name: "Quartier de la Boucherie", cat: "patrimoine",
    lat: 45.8290, lng: 1.2580, rating: 4.6, reviews: 158,
    desc: "Maisons à colombages, ruelles médiévales et chapelle Saint-Aurélien : le cœur historique des bouchers limougeauds.",
    tags: ["Médiéval", "Balade"],
  },
  {
    id: "dubouche", name: "Musée national Adrien Dubouché", cat: "culture",
    lat: 45.8356, lng: 1.2503, rating: 4.7, reviews: 187,
    desc: "L'une des plus grandes collections de céramique au monde, vitrine des arts du feu et de la porcelaine de Limoges.",
    tags: ["Porcelaine", "Musée"],
  },
  {
    id: "beauxarts", name: "Musée des Beaux-Arts", cat: "culture",
    lat: 45.8280, lng: 1.2668, rating: 4.6, reviews: 121,
    desc: "Installé dans l'ancien palais de l'Évêché, il abrite une collection exceptionnelle d'émaux de Limoges.",
    tags: ["Émaux", "Musée"],
  },
  {
    id: "opera", name: "Opéra de Limoges", cat: "culture",
    lat: 45.8316, lng: 1.2573, rating: 4.5, reviews: 96,
    desc: "Opéra, danse, concerts : la grande scène lyrique de la ville en plein centre.",
    tags: ["Spectacles"],
  },
  {
    id: "halles", name: "Halles centrales", cat: "resto",
    lat: 45.8303, lng: 1.2575, rating: 4.5, reviews: 240,
    desc: "Marché couvert à la charpente métallique ornée d'une frise en porcelaine. Produits du Limousin et comptoirs gourmands.",
    tags: ["Marché", "Produits locaux"],
  },
  {
    id: "eveche", name: "Jardins de l'Évêché", cat: "nature",
    lat: 45.8277, lng: 1.2660, rating: 4.8, reviews: 175,
    desc: "Jardins en terrasses surplombant la Vienne, avec un jardin botanique et une vue superbe sur les ponts.",
    tags: ["Vue", "Gratuit"],
  },
  {
    id: "pont", name: "Pont Saint-Étienne", cat: "nature",
    lat: 45.8262, lng: 1.2672, rating: 4.6, reviews: 88,
    desc: "Pont médiéval du XIIIᵉ siècle sur la Vienne, point de départ idéal des balades en bord de rivière.",
    tags: ["Bords de Vienne"],
  },
  {
    id: "beaublanc", name: "Palais des Sports de Beaublanc", cat: "sport",
    lat: 45.8430, lng: 1.2440, rating: 4.7, reviews: 143,
    desc: "L'antre du Limoges CSP, club de basket champion d'Europe en 1993. Ambiance légendaire les soirs de match.",
    tags: ["Basket", "CSP"],
  },
  {
    id: "aquarium", name: "Aquarium du Limousin", cat: "culture",
    lat: 45.8315, lng: 1.2594, rating: 4.3, reviews: 67,
    desc: "Installé dans d'anciens réservoirs d'eau souterrains, en plein centre-ville.",
    tags: ["Famille"],
  },
  {
    id: "thuillat", name: "Parc Victor Thuillat", cat: "nature",
    lat: 45.8398, lng: 1.2592, rating: 4.4, reviews: 72,
    desc: "Parc paysager avec kiosque, jeux pour enfants et grands arbres, à deux pas du centre.",
    tags: ["Famille", "Gratuit"],
  },
  {
    id: "jourdan", name: "Place Jourdan", cat: "shopping",
    lat: 45.8322, lng: 1.2640, rating: 4.2, reviews: 54,
    desc: "Grande place arborée entourée de cafés et de boutiques, marchés et animations toute l'année.",
    tags: ["Terrasses"],
  },
];

// Exemples d'événements (remplacés par l'agenda OpenAgenda quand il répond)
const EVENTS = [
  { id: "e1", title: "Match Limoges CSP", place: "beaublanc", date: "2026-10-03T20:00", cat: "sport", price: "Dès 15 €" },
  { id: "e2", title: "Nuit des arts du feu", place: "dubouche", date: "2026-10-10T19:00", cat: "culture", price: "Gratuit" },
  { id: "e3", title: "Marché des producteurs", place: "halles", date: "2026-10-04T08:00", cat: "resto", price: "Entrée libre" },
  { id: "e4", title: "Concert symphonique", place: "opera", date: "2026-10-17T20:30", cat: "culture", price: "Dès 20 €" },
  { id: "e5", title: "Balade contée médiévale", place: "boucherie", date: "2026-10-11T15:00", cat: "patrimoine", price: "8 €" },
  { id: "e6", title: "Run des bords de Vienne", place: "pont", date: "2026-10-18T09:30", cat: "sport", price: "Gratuit" },
  { id: "e7", title: "Exposition « Porcelaine contemporaine »", place: "dubouche", date: "2026-10-01T10:00", cat: "culture", price: "7 €" },
  { id: "e8", title: "Visite guidée de la cathédrale", place: "cathedrale", date: "2026-10-05T14:30", cat: "patrimoine", price: "Gratuit" },
  { id: "e9", title: "Émaux : atelier découverte", place: "beauxarts", date: "2026-10-08T15:00", cat: "culture", price: "12 €" },
];

const NEWS = [
  { tag: "Ville", title: "Nouveaux horaires des bus du réseau STCLM", time: "Il y a 2 h" },
  { tag: "Culture", title: "Une exposition de porcelaine contemporaine ouvre ses portes", time: "Il y a 5 h" },
  { tag: "Sport", title: "Le CSP prépare son prochain déplacement", time: "Hier" },
  { tag: "Quartiers", title: "Travaux rue Jean-Jaurès : ce qui change pour la circulation", time: "Hier" },
];

const DEALS = [
  { shop: "Café de la place", offer: "-20 %", detail: "sur les brunchs du dimanche", place: "jourdan" },
  { shop: "Atelier Porcelaine", offer: "1 acheté = 1 offert", detail: "sur les tasses peintes main", place: "dubouche" },
  { shop: "Comptoir des Halles", offer: "Dégustation offerte", detail: "de produits du Limousin", place: "halles" },
];

const TOURS = [
  { id: "t1", title: "Limoges médiéval", duration: "1 h 30", km: "2,1 km", stops: ["boucherie", "halles", "cathedrale", "pont"], gradient: "var(--flame)" },
  { id: "t2", title: "Arts du feu", duration: "2 h", km: "3,4 km", stops: ["dubouche", "beauxarts", "gare"], gradient: "var(--ocean)" },
  { id: "t3", title: "Limoges au vert", duration: "1 h", km: "1,8 km", stops: ["eveche", "pont", "thuillat"], gradient: "var(--forest)" },
];

// Équipes suivies par le widget Sport (recherchées sur TheSportsDB)
const TEAMS = [
  { id: "csp",  name: "Limoges CSP",      query: "Limoges CSP",      sport: "Basketball", label: "Basket",   short: "CSP", color: "#0E7C3A" },
  { id: "hand", name: "Limoges Handball", query: "Limoges Handball", sport: "Handball",   label: "Handball", short: "LH",  color: "#E3161B" },
  { id: "lfc",  name: "Limoges FC",       query: "Limoges FC",       sport: "Soccer",     label: "Football", short: "LFC", color: "#3A9BDC" },
];

const SPORT_SAMPLE = {
  csp:  { league: "Basket · Betclic Élite", last: { opp: "Le Mans", my: 84, their: 79, date: "2026-09-26T20:00" }, next: { opp: "Cholet", date: "2026-10-03T20:00", home: true } },
  hand: { league: "Handball · Starligue",   last: { opp: "Nantes",  my: 29, their: 31, date: "2026-09-25T20:00" }, next: { opp: "Chambéry", date: "2026-10-02T20:00", home: true } },
  lfc:  { league: "Football",               last: { opp: "Tulle",   my: 1,  their: 1,  date: "2026-09-27T15:00" }, next: { opp: "Brive", date: "2026-10-04T18:00", home: false } },
};

const WEATHER_SAMPLE = {
  temp: 17, code: 2, wind: 12,
  days: [
    { date: "2026-09-27", code: 2, min: 10, max: 19 },
    { date: "2026-09-28", code: 61, min: 11, max: 16 },
    { date: "2026-09-29", code: 1, min: 9, max: 20 },
  ],
};

// Articles Wikipédia du widget « Le saviez-vous ? » (un par jour)
const SAVOIR_TITLES = [
  "Gare de Limoges-Bénédictins",
  "Porcelaine de Limoges",
  "Cathédrale Saint-Étienne de Limoges",
  "Musée national Adrien-Dubouché",
  "Limoges CSP",
  "Ostensions limousines",
  "Émail de Limoges",
];

const QUIZ = [
  {
    q: "En quelle année la gare des Bénédictins a-t-elle été inaugurée ?",
    options: ["1889", "1929", "1954", "1901"], answer: 1,
    fact: "Inaugurée en 1929, elle est célèbre pour son campanile de 67 mètres.",
  },
  {
    q: "Quelle matière première a fait la renommée de la porcelaine de Limoges ?",
    options: ["Le kaolin", "Le granit", "Le calcaire", "L'argile rouge"], answer: 0,
    fact: "Le kaolin découvert à Saint-Yrieix-la-Perche au XVIIIᵉ siècle a lancé l'aventure.",
  },
  {
    q: "Quel peintre impressionniste est né à Limoges ?",
    options: ["Claude Monet", "Edgar Degas", "Auguste Renoir", "Paul Cézanne"], answer: 2,
    fact: "Pierre-Auguste Renoir est né à Limoges en 1841 et a débuté comme peintre sur porcelaine.",
  },
  {
    q: "En quelle année le Limoges CSP a-t-il remporté la Coupe d'Europe des clubs champions ?",
    options: ["1985", "1993", "2000", "2008"], answer: 1,
    fact: "Le CSP est devenu champion d'Europe en 1993, une première pour un club français en sport collectif.",
  },
  {
    q: "Quelle rivière traverse Limoges ?",
    options: ["La Dordogne", "La Creuse", "La Vienne", "La Loire"], answer: 2,
    fact: "La Vienne traverse la ville, franchie notamment par les ponts Saint-Étienne et Saint-Martial.",
  },
  {
    q: "Tous les combien d'années ont lieu les Ostensions limousines ?",
    options: ["Tous les 3 ans", "Tous les 5 ans", "Tous les 7 ans", "Tous les 10 ans"], answer: 2,
    fact: "Cette tradition inscrite au patrimoine immatériel de l'UNESCO revient tous les sept ans.",
  },
];

// Limodoku : grille 3×3 façon Metrodoku. Un lieu va dans une case s'il correspond
// à la ligne (quartier) ET à la colonne (critère). Chaque lieu ne sert qu'une fois.
const DOKU = {
  rows: [
    { id: "cite",    label: "La Cité",         hint: "Quartier de la cathédrale", text: "dans la Cité" },
    { id: "chateau", label: "Le Château",      hint: "Saint-Martial, Halles, Boucherie", text: "dans le Château" },
    { id: "vienne",  label: "Bords de Vienne", hint: "Sur la rivière ou sa rive", text: "au bord de la Vienne" },
  ],
  cols: [
    { id: "prenom", label: "Un prénom",   hint: "dans le nom du lieu",  fail: "n'a pas de prénom dans son nom" },
    { id: "feu",    label: "Arts du feu", hint: "porcelaine ou émail",  fail: "n'est pas lié à la porcelaine ni à l'émail" },
    { id: "air",    label: "Plein air",   hint: "rue, jardin, pont…",   fail: "n'est pas en plein air" },
  ],
  outside: "hors du centre historique",
  places: [
    { id: "cathedrale", name: "Cathédrale Saint-Étienne",      icon: "landmark", zone: "cite",    tags: ["prenom"] },
    { id: "jardins",    name: "Jardins de l'Évêché",           icon: "tree",     zone: "cite",    tags: ["air"] },
    { id: "beauxarts",  name: "Musée des Beaux-Arts (émaux)",  icon: "palette",  zone: "cite",    tags: ["feu"] },
    { id: "stmichel",   name: "Église Saint-Michel-des-Lions", icon: "landmark", zone: "chateau", tags: ["prenom"] },
    { id: "staurelien", name: "Chapelle Saint-Aurélien",       icon: "landmark", zone: "chateau", tags: ["prenom"] },
    { id: "halles",     name: "Halles centrales (frise en porcelaine)", icon: "utensils", zone: "chateau", tags: ["feu"] },
    { id: "boucherie",  name: "Rue de la Boucherie",           icon: "route",    zone: "chateau", tags: ["air"] },
    { id: "pontste",    name: "Pont Saint-Étienne",            icon: "route",    zone: "vienne",  tags: ["prenom", "air"] },
    { id: "pontstm",    name: "Pont Saint-Martial",            icon: "route",    zone: "vienne",  tags: ["prenom", "air"] },
    { id: "casseaux",   name: "Four des Casseaux (porcelaine)", icon: "flame",   zone: "vienne",  tags: ["feu"] },
    { id: "dubouche",   name: "Musée Adrien Dubouché",         icon: "palette",  zone: null,      tags: ["prenom", "feu"] },
    { id: "gare",       name: "Gare des Bénédictins",          icon: "landmark", zone: null,      tags: [] },
    { id: "thuillat",   name: "Parc Victor Thuillat",          icon: "tree",     zone: null,      tags: ["prenom", "air"] },
  ],
};
