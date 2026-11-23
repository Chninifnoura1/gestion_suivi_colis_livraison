export const ROLES = { SUPER_ADMIN: "SUPER_ADMIN", ADMIN: "ADMIN", LIVREUR: "LIVREUR" };

export const ROLE_META = {
  SUPER_ADMIN: { label: "Super administrateur", space: "Espace plateforme", base: "/super" },
  ADMIN: { label: "Administrateur d'agence", space: "Espace agence", base: "/admin" },
  LIVREUR: { label: "Livreur", space: "Espace livreur", base: "/livreur" },
};

/* Statuts d'un colis. `tone` pilote la couleur (voir tokens.css), `step` la position dans le parcours. */
export const STATUS = {
  pending:          { label: "En attente",            tone: "warning", step: 0, event: "Colis enregistré" },
  shipped:          { label: "Expédié",               tone: "info",    step: 1, event: "Colis expédié" },
  in_transit:       { label: "En transit",            tone: "info",    step: 2, event: "En transit" },
  arrived: {
  label: "Arrivé à une agence",
  tone: "violet",
  step: 3,
  event: "Arrivé à une agence du trajet"
},
  assigned:         { label: "Livreur affecté",       tone: "teal",    step: 4, event: "Livreur affecté" },
  out_for_delivery: { label: "En cours de livraison", tone: "orange",  step: 5, event: "En cours de livraison" },
  delivered:        { label: "Livré",                 tone: "success", step: 6, event: "Livré" },
  failed:           { label: "Échec de livraison",    tone: "danger",  step: 5, event: "Échec de livraison" },
  cancelled:        { label: "Annulé",                tone: "neutral", step: 0, event: "Colis annulé" },
};
export const FLOW = ["pending", "shipped", "in_transit", "arrived", "assigned", "out_for_delivery", "delivered"];

/* Vue « livraison » d'un colis affecté à un livreur */
export const DELIVERY_STATUS = {
  assigned:         { label: "En attente", tone: "warning" },
  out_for_delivery: { label: "En cours",   tone: "orange" },
  delivered:        { label: "Terminée",   tone: "success" },
  failed:           { label: "Échouée",    tone: "danger" },
};

/* Messages affichés au public selon le statut */
export const PUBLIC_MESSAGE = {
  pending:          { title: "Votre colis est enregistré", text: "L'agence d'origine prépare l'expédition." },
  shipped:          { title: "Votre colis a quitté l'agence", text: "Il sera bientôt pris en charge par le transporteur." },
  in_transit:       { title: "Votre colis est en route", text: "Il voyage vers l'agence de destination." },
  arrived: {
  title: "Votre colis est arrivé dans une agence",
  text: "Il poursuivra son acheminement vers son agence de destination."
 },
  assigned:         { title: "Un livreur a été affecté", text: "Votre colis sera livré prochainement." },
  out_for_delivery: { title: "Votre colis est en cours de livraison", text: "Le livreur est en route. Gardez votre téléphone à portée de main." },
  delivered:        { title: "Votre colis a été livré", text: "La livraison est terminée. Merci d'avoir choisi ColisTrack." },
  failed:           { title: "La livraison n'a pas pu aboutir", text: "L'agence va vous recontacter pour reprogrammer la livraison." },
  cancelled:        { title: "Ce colis a été annulé", text: "Contactez l'agence d'origine pour plus d'informations." },
};

export const PARCEL_TYPES = ["Carton", "Enveloppe", "Sac", "Palette", "Fragile", "Document"];
export const CANCELLABLE = ["pending", "shipped"];
export const PROBLEM_TYPES = [
  "Destinataire absent", "Destinataire injoignable", "Adresse introuvable",
  "Refus du colis", "Colis endommagé", "Autre problème",
];
export const PERIODS = [
  { id: 7, label: "7 jours" },
  { id: 30, label: "30 jours" },
  { id: 90, label: "90 jours" },
];
