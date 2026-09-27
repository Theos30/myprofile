# Limoges — l'app de la ville

Prototype web mobile de l'application imaginée dans la page Notion « Idées » :
un point d'entrée unique pour découvrir, s'informer et partager Limoges.

## Fonctionnalités (V1)

- **Accueil** : recherche, catégories, événements à venir, bons plans, parcours, actualités
- **Carte interactive** (Leaflet + OpenStreetMap) : filtres par catégorie, parcours tracés, « autour de moi »
- **Fiches lieux** : description, note, favoris, itinéraire, avis (enregistrés sur l'appareil)
- **Agenda** filtrable par thème
- **Quiz Limoges** avec points et badges
- **Guide** : chat simple par mots-clés pour trouver lieux, sorties et bons plans
- Thème clair / sombre, installable (manifest)

## Charte couleur (logo « Arts du feu et innovation »)

| Rôle | Couleur |
| --- | --- |
| Bleu du disque | `#244E9B` |
| Bleu de la sphère | `#3A9BDC` |
| Rouge flamme / filet | `#E3161B` |
| Orange flamme | `#F39200` |
| Jaune flamme | `#FFD500` |
| Texte « LIMOGES » | `#1D1D1B` |
| Gris « ET INNOVATION » | `#6F6F6E` |

## Lancer

Aucune compilation : servir le dossier, par exemple `python3 -m http.server` dans `limoges-app/`,
puis ouvrir http://localhost:8000. Les données (`data.js`) sont des exemples à remplacer par une vraie source.
