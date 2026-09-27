# Limoges — l'app de la ville

Prototype web mobile de l'application imaginée dans la page Notion « Idées » :
un point d'entrée unique pour découvrir, s'informer et partager Limoges.

## Écrans

- **Ma page** (écran d'accueil) : un fil de widgets que chacun organise avec « Personnaliser »
  (ajouter, retirer, déplacer par glisser-déposer ou flèches, taille demi/pleine largeur, prénom).
- **Partager** : les habitants publient eux-mêmes leurs événements (titre, catégorie, date, lieu,
  organisateur, description). Chacun peut dire « J'y vais », signaler un contenu (masqué après
  3 signalements) et supprimer ses propres publications. Ces événements apparaissent aussi dans
  l'Agenda et dans le widget « Proposés par les habitants ».
- **Agenda** filtrable (culture, sport, autres).
- **Jouer** : quiz Limoges avec points et badges.
- **Guide** : chat par mots-clés (lieux, sorties, score du CSP, météo).
- Fiches lieux avec favoris, itinéraire et avis.

## Widgets et sources de données

| Widget | Source en direct | Clé API |
| --- | --- | --- |
| Météo | [Open-Meteo](https://open-meteo.com) | aucune |
| Sport à Limoges (CSP, Limoges Handball, Limoges FC) | [TheSportsDB](https://www.thesportsdb.com) | clé publique gratuite `123` |
| Événements, Culture | [OpenAgenda via OpenDataSoft](https://public.opendatasoft.com/explore/dataset/evenements-publics-openagenda/) | aucune |
| Le saviez-vous ? | Wikipédia (API REST) | aucune |
| Quiz du jour, Limodoku | contenu de l'app | — |
| Proposés par les habitants | publications des utilisateurs | — |
| Bons plans, Actualités | exemples en attendant un espace commerçants | — |

Chaque widget affiche **En direct** quand la source répond, sinon **Exemple** avec des données
d'exemple (`data.js`). Les préférences (widgets, équipes, prénom, favoris, avis) restent sur l'appareil.

## Événements partagés : où sont-ils enregistrés ?

- **Page Artifact** : dans la base partagée de la page (collections `events`, `going`, `flags`),
  visible en direct par tous ses visiteurs.
- **Version du dépôt sans serveur** : sur l'appareil uniquement (mode local, avec trois exemples).
  Pour une vraie mise en ligne, il faudra brancher un serveur (par exemple Firebase ou Supabase)
  derrière l'objet `community` de `app.js`, avec comptes utilisateurs et modération.

## Charte

Fond : photo de la gare des Bénédictins (`images/gare.webp`) sous un voile bleu du logo.

| Rôle | Couleur |
| --- | --- |
| Bleu du disque (fond) | `#244E9B` |
| Bleu de la sphère | `#3A9BDC` |
| Flamme : rouge → orange → jaune | `#E3161B` `#F39200` `#FFD500` |
| Texte « LIMOGES » | `#1D1D1B` |
| Gris « ET INNOVATION » | `#6F6F6E` |

## Lancer

Aucune compilation : servir le dossier, par exemple `python3 -m http.server` dans `limoges-app/`,
puis ouvrir http://localhost:8000.
