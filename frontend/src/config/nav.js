import {
  Route,
  LayoutDashboard, Building2, ShieldCheck, Bell, UserCog, Package, PackagePlus, Users, Truck, UserCheck, ClipboardList, History, ListChecks, PackageCheck,
} from "lucide-react";

const account = (base) => ({ title: "Compte", items: [
  { to: `${base}/notifications`, label: "Notifications", icon: Bell },
  { to: `${base}/profil`, label: "Profil", icon: UserCog },
] });

export const NAV = {
  SUPER_ADMIN: [
    { title: "Vue d'ensemble", items: [{ to: "/super", label: "Tableau de bord", icon: LayoutDashboard, end: true }] },
    { title: "Plateforme", items: [
      { to: "/super/agences", label: "Agences", icon: Building2 },
      { to: "/super/admins", label: "Administrateurs", icon: ShieldCheck },
    ] },
    {
      title: "Compte",
      items: [
        { to: "/super/profil", label: "Profil", icon: UserCog },
      ],
    },
  ],
  ADMIN: [
    { title: "Pilotage", items: [{ to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, end: true }] },
    { title: "Colis", items: [
      { to: "/admin/colis", label: "Gestion des colis", icon: Package },
      { to: "/admin/colis/nouveau", label: "Ajouter un colis", icon: PackagePlus },
    ] },
    { title: "Livraisons", items: [
      { to: "/admin/livreurs", label: "Livreurs", icon: Truck },
      { to: "/admin/trajets", label: "Trajets inter-agences", icon: Route },
      { to: "/admin/chargement-colis", label: "Chargement des colis", icon: PackageCheck },
      { to: "/admin/reception-colis", label: "Réception des colis", icon: PackageCheck },
      { to: "/admin/historique", label: "Historique des statuts", icon: History },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
    ] },
  ],
  LIVREUR: [
    { title: "Ma tournée", items: [
      { to: "/livreur", label: "Tableau de bord", icon: LayoutDashboard, end: true },
      { to: "/livreur/trajets", label: "Mes trajets", icon: Route },
    ] },
    { title: "Compte", items: [
      { to: "/livreur/notifications", label: "Notifications", icon: Bell },
    ] },
  ],
};

/* Ã‰lÃ©ments de la barre mobile (4 max ; le reste passe dans Â« Plus Â») */
export const MOBILE_PRIMARY = {
  SUPER_ADMIN: ["/super", "/super/agences", "/super/admins"],
  ADMIN: ["/admin", "/admin/colis", "/admin/trajets"],
 LIVREUR: ["/livreur", "/livreur/trajets", "/livreur/notifications"],
};

export const flatNav = (role) => NAV[role].flatMap((g) => g.items);
export function activeItem(role, path) {
  return flatNav(role).filter((i) => (i.end ? path === i.to : path === i.to || path.startsWith(`${i.to}/`))).sort((a, b) => b.to.length - a.to.length)[0];
}

