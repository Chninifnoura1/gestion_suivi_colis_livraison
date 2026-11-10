// Données de démonstration (à remplacer par votre API)
export const ST = { "En attente": "#F59E0B", "Expédié": "#3B82F6", "En transit": "#2563EB", "Arrivé à destination": "#8B5CF6", "Livreur affecté": "#0891B2",
  "En cours de livraison": "#0E7490", "Livré": "#16A36A", "Échec de livraison": "#DC4C4C", Actif: "#16A36A", Inactif: "#718096", Disponible: "#16A36A",
  Indisponible: "#718096", "Non lu": "#F28C28", Lu: "#718096", "Terminée": "#16A36A", "En cours": "#0E7490" };

export const C = [["CT-0001", "Karim Alami", "Sara Benali", "Casablanca", "Agadir", "03/11/2026", "Arrivé à destination"],
  ["CT-0002", "Nadia Idrissi", "Omar Tazi", "Rabat", "Marrakech", "04/11/2026", "En transit"],
  ["CT-0003", "Youssef Amrani", "Laila Cherkaoui", "Fès", "Agadir", "05/11/2026", "En cours de livraison"],
  ["CT-0004", "Hind Berrada", "Reda Lahlou", "Tanger", "Agadir", "06/11/2026", "Livré"],
  ["CT-0005", "Salma Naciri", "Adil Fassi", "Agadir", "Casablanca", "07/11/2026", "En attente"]];

export const CC = ["N° suivi", "Expéditeur", "Destinataire", "Départ", "Arrivée", "Date", "Statut"];

export const LV = [["Hamza Ouali", "0600112233", "Disponible", "2"], ["Imane Rachidi", "0600445566", "Disponible", "0"], ["Mehdi Karimi", "0600778899", "Indisponible", "4"]];

export const STEPS = ["Colis enregistré", "Colis expédié", "Colis en transit", "Colis arrivé à destination", "Livreur affecté", "En cours de livraison", "Livré"];

export const NOTIFS = [["Colis arrivé à destination", "CT-0001 est arrivé à Agadir.", "07/11 09:12", 0], ["Livreur affecté", "Hamza Ouali livrera CT-0003.", "06/11 16:40", 0],
  ["Colis livré", "CT-0004 a été livré.", "06/11 11:05", 1], ["Colis enregistré", "CT-0005 a été enregistré.", "05/11 08:30", 1]];

export const KV = (o) => Object.entries(o);

export const COLIS_KV = [["Informations générales", KV({ "N° suivi": "CT-0001", Création: "03/11/2026", Expédition: "04/11/2026", Description: "Vêtements", Type: "Carton", Poids: "4,2 kg", Dimensions: "40×30×20 cm" })],
  ["Expéditeur", KV({ Nom: "Karim Alami", Téléphone: "0612345678", Email: "karim@mail.ma", Ville: "Casablanca" })],
  ["Destinataire", KV({ Nom: "Sara Benali", Téléphone: "0698765432", Adresse: "12 Rue Hassan II", Ville: "Agadir" })],
  ["Transport", KV({ Départ: "Casablanca", Arrivée: "Agadir", "Arrivée prévue": "08/11/2026", Statut: "Arrivé à destination" })]];

export const PERSON = (t) => [["Informations personnelles", KV({ Nom: t, Email: "contact@mail.ma", Téléphone: "0600000000", Adresse: "Agadir", Inscription: "01/09/2026" })]];

export const SEC = { exp: ["Expéditeur", ["Nom complet", "Téléphone", "Email (facultatif)", "Adresse", "Ville"]],
  dest: ["Destinataire", ["Nom complet", "Téléphone", "Email (facultatif)", "Adresse complète", "Ville", "Code postal (facultatif)"]],
  col: ["Colis", ["Description du contenu", "Type de colis", "Poids (kg)", "Longueur (cm)", "Largeur (cm)", "Hauteur (cm)", "Remarques supplémentaires"]],
  ship: ["Expédition", ["Ville de départ", "Ville d'arrivée", "Date d'expédition prévue", "Frais de livraison (MAD)"]] };

export const PROFIL = [["Informations personnelles", ["Photo", "Nom", "Prénom", "Email", "Téléphone", "Adresse"]], ["Sécurité", ["Ancien mot de passe", "Nouveau mot de passe", "Confirmer le nouveau mot de passe"]]];

export const B = (k, o) => ({ k, ...o });

export const LIVS = [["CT-0001", "Sara Benali", "0698765432", "12 Rue Hassan II, Agadir", "07/11/2026", "Arrivé à destination"], ["CT-0003", "Laila Cherkaoui", "0655443322", "8 Bd Anfa, Agadir", "06/11/2026", "En cours de livraison"], ["CT-0004", "Reda Lahlou", "0611223344", "3 Rue Founty, Agadir", "05/11/2026", "Livré"]];

export const act = (l, p) => B("btns", { items: [[l, "", p]] });
