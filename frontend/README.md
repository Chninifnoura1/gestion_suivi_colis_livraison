# ColisTrack — Frontend (refonte complète)

React 18 · Vite · JavaScript/JSX · Lucide React — **aucune dépendance ajoutée** (routeur, graphiques et design system sont internes).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Parcours de démonstration
| Rôle | Comment y accéder |
|---|---|
| Client (public, sans compte) | Page d'accueil `#/` — essayez les exemples (en transit, arrivé, livré, introuvable, erreur réseau) |
| SUPER_ADMIN / ADMIN (agence d'Agadir) / LIVREUR (Hamza Ouali) | `#/connexion` → choisir un profil |

> ⚠️ Mode démonstration : l'authentification et l'API sont **simulées** (`src/services/api.js`, données dans `src/data/seed.js`). Rien n'est persisté.

## Architecture
```
src/
  styles/        tokens.css (couleurs, espacements, rayons, ombres, mouvement, thème sombre) · base · ui · layout · domain
  components/ui/ design system (Button, Field, Modal/Drawer, Popover/Menu/Tooltip, Tabs, Pagination, Kpi, Feedback…)
  components/charts, data/DataTable, domain/ (StatusBadge, Timeline, RouteLine, RouteMap, Logo…)
  layouts/       AppShell (sidebar repliable, header, nav mobile) · PublicLayout
  pages/         public · auth · super · admin · livreur · shared (notifications, profil)
  services/api.js  ← seul point d'accès aux données : à remplacer par des fetch() FastAPI
  context/ hooks/ lib/ config/nav.js routes.jsx
```
- **Routage** : hash (`#/admin/colis/CT-0001`), URL réelles par page, rôles déclarés dans `routes.jsx`.
- **Branchement API** : chaque fonction de `services/api.js` correspond à un appel HTTP. Les règles de périmètre y sont appliquées comme le serveur devra le faire (ADMIN = son agence, LIVREUR = ses livraisons). **Le serveur doit les re-vérifier.**
- **Suivi public** : `getTracking()` ne renvoie aucune donnée personnelle.
