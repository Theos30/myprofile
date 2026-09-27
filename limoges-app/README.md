# Limoges — l'app de la ville

Prototype web mobile de l'application imaginée dans la page Notion « Idées » :
un point d'entrée unique pour découvrir, s'informer et partager Limoges.

## Écrans

- **Ma page** (écran d'accueil) : un fil de widgets que chacun organise avec « Personnaliser »
  (ajouter, retirer, déplacer par glisser-déposer ou flèches, taille demi/pleine largeur, prénom).
- **Carte** interactive (Leaflet + OpenStreetMap) : filtres, parcours tracés, « autour de moi ».
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
| Quiz du jour, Parcours, Explorer | contenu de l'app | — |
| Bons plans, Actualités | exemples en attendant un espace commerçants | — |

Chaque widget affiche **En direct** quand la source répond, sinon **Exemple** avec des données
d'exemple (`data.js`). Les préférences (widgets, équipes, prénom, favoris, avis) restent sur l'appareil.

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
