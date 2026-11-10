import { LayoutDashboard, Package, PlusCircle, Users, Truck, UserCheck, ClipboardList, History, Bell, User, MapPin } from "lucide-react";
export const MENU = {
  admin: [["dash", "Tableau de bord", LayoutDashboard], ["colis", "Gestion des colis", Package], ["add", "Ajouter un colis", PlusCircle], ["clients", "Gestion des clients", Users], ["livreurs", "Gestion des livreurs", Truck],
    ["assign", "Affectation des livreurs", UserCheck], ["livraisons", "Gestion des livraisons", ClipboardList], ["histo", "Historique des statuts", History], ["notifs", "Notifications", Bell], ["profil", "Profil et paramètres", User]],
  client: [["dash", "Dashboard", LayoutDashboard], ["colis", "Mes colis", Package], ["suivi", "Suivi de colis", MapPin], ["notifs", "Notifications", Bell], ["profil", "Profil", User]],
  livreur: [["dash", "Dashboard", LayoutDashboard], ["liv", "Mes livraisons", Truck], ["notifs", "Notifications", Bell], ["profil", "Profil", User]],
};

export const TITLES = { admin: "Espace Administrateur", client: "Espace Client", livreur: "Espace Livreur" };
