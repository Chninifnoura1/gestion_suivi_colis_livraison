import { lazy } from "react";
import { buildPath } from "./lib/router";

const P = (loader) => lazy(loader);
const SUPER = ["SUPER_ADMIN"], ADMIN = ["ADMIN"], LIV = ["LIVREUR"];

/* Ordre important : les chemins statiques (…/nouveau) précèdent les chemins à paramètre (…/:id).
   `parent` sert au fil d'Ariane ; `roles` définit qui peut accéder à la page (le serveur devra le re-vérifier). */
export const ROUTES = [
  /* Public */
  { path: "/", component: P(() => import("./pages/public/Home")) },
  { path: "/suivi/:code", component: P(() => import("./pages/public/TrackResult")) },
  { path: "/connexion", guest: true, component: P(() => import("./pages/auth/Login")) },

  /* SUPER_ADMIN */
  { path: "/super", roles: SUPER, title: "Tableau de bord", component: P(() => import("./pages/super/Dashboard")) },
  { path: "/super/agences", roles: SUPER, title: "Agences", parent: "/super", component: P(() => import("./pages/super/Agencies")) },
  { path: "/super/agences/:id", roles: SUPER, title: "Détails de l'agence", parent: "/super/agences", component: P(() => import("./pages/super/AgencyDetails")) },
  { path: "/super/admins", roles: SUPER, title: "Administrateurs", parent: "/super", component: P(() => import("./pages/super/Admins")) },
  { path: "/super/admins/nouveau", roles: SUPER, title: "Nouvel administrateur", parent: "/super/admins", component: P(() => import("./pages/super/AdminForm")) },
  { path: "/super/admins/:id/modifier", roles: SUPER, title: "Modifier l'administrateur", parent: "/super/admins", component: P(() => import("./pages/super/AdminForm")) },
  { path: "/super/profil", roles: SUPER, title: "Profil", parent: "/super", component: P(() => import("./pages/shared/Profile")) },

  /* ADMIN */
  { path: "/admin", roles: ADMIN, title: "Tableau de bord", component: P(() => import("./pages/admin/Dashboard")) },
  { path: "/admin/colis", roles: ADMIN, title: "Gestion des colis", parent: "/admin", component: P(() => import("./pages/admin/Parcels")) },
  { path: "/admin/colis/nouveau", roles: ADMIN, title: "Ajouter un colis", parent: "/admin/colis", component: P(() => import("./pages/admin/ParcelForm")) },
  { path: "/admin/colis/:id", roles: ADMIN, title: "Détails du colis", parent: "/admin/colis", component: P(() => import("./pages/admin/ParcelDetails")) },
  { path: "/admin/colis/:id/modifier", roles: ADMIN, title: "Modifier le colis", parent: "/admin/colis/:id", component: P(() => import("./pages/admin/ParcelForm")) },
  { path: "/admin/livreurs", roles: ADMIN, title: "Livreurs", parent: "/admin", component: P(() => import("./pages/admin/Couriers")) },
  { path: "/admin/livreurs/nouveau", roles: ADMIN, title: "Ajouter un livreur", parent: "/admin/livreurs", component: P(() => import("./pages/admin/CourierForm")) },
  { path: "/admin/livreurs/:id", roles: ADMIN, title: "Détails du livreur", parent: "/admin/livreurs", component: P(() => import("./pages/admin/CourierDetails")) },
  { path: "/admin/livreurs/:id/modifier", roles: ADMIN, title: "Modifier le livreur", parent: "/admin/livreurs/:id", component: P(() => import("./pages/admin/CourierForm")) },
  { path: "/admin/trajets", roles: ADMIN, title: "Trajets inter-agences", parent: "/admin", component: P(() => import("./pages/admin/RouteAssignment")) },
  { path: "/admin/chargement-colis", roles: ADMIN, title: "Chargement des colis", parent: "/admin", component: P(() => import("./pages/admin/ParcelLoading")) },
  { path: "/admin/reception-colis", roles: ADMIN, title: "Réception des colis", parent: "/admin", component: P(() => import("./pages/admin/ParcelReception")) },
  { path: "/admin/livraisons", roles: ADMIN, title: "Livraisons", parent: "/admin", component: P(() => import("./pages/admin/Deliveries")) },
  { path: "/admin/livraisons/:id", roles: ADMIN, title: "Détails de la livraison", parent: "/admin/livraisons", component: P(() => import("./pages/admin/DeliveryDetails")) },
  { path: "/admin/historique", roles: ADMIN, title: "Historique des statuts", parent: "/admin", component: P(() => import("./pages/admin/History")) },
  { path: "/admin/notifications", roles: ADMIN, title: "Notifications", parent: "/admin", component: P(() => import("./pages/shared/Notifications")) },


  /* LIVREUR */
  { path: "/livreur", roles: LIV, title: "Tableau de bord", component: P(() => import("./pages/livreur/Dashboard")) },
  { path: "/livreur/trajets", roles: LIV, title: "Mes trajets", parent: "/livreur", component: P(() => import("./pages/livreur/MyRoutes")) },
  { path: "/livreur/notifications", roles: LIV, title: "Notifications", parent: "/livreur", component: P(() => import("./pages/shared/Notifications")) },
];

/* Fil d'Ariane : remonte la chaîne `parent` jusqu'au tableau de bord (exclu, sauf si on y est). */
export function getCrumbs(route, params) {
  const chain = []; let cur = route;
  while (cur) {
    chain.unshift({ title: cur.title, to: buildPath(cur.path, params) });
    cur = cur.parent ? ROUTES.find((r) => r.path === cur.parent) : null;
  }
  return chain.length > 1 ? chain.slice(1) : chain;
}
