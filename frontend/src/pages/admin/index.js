import Dashboard from "./Dashboard";
import GestionColis from "./GestionColis";
import AjouterColis from "./AjouterColis";
import DetailsColis from "./DetailsColis";
import ModifierColis from "./ModifierColis";
import GestionClients from "./GestionClients";
import DetailsClient from "./DetailsClient";
import GestionLivreurs from "./GestionLivreurs";
import AjouterLivreur from "./AjouterLivreur";
import DetailsLivreur from "./DetailsLivreur";
import AffectationLivreurs from "./AffectationLivreurs";
import GestionLivraisons from "./GestionLivraisons";
import DetailsLivraison from "./DetailsLivraison";
import HistoriqueStatuts from "./HistoriqueStatuts";
import Notifications from "./Notifications";
import ProfilParametres from "./ProfilParametres";
import Login from "./Login";

export const ADMIN_PAGES = {
  dash: Dashboard,
  colis: GestionColis,
  add: AjouterColis,
  det: DetailsColis,
  edit: ModifierColis,
  clients: GestionClients,
  cdet: DetailsClient,
  livreurs: GestionLivreurs,
  addl: AjouterLivreur,
  ldet: DetailsLivreur,
  assign: AffectationLivreurs,
  livraisons: GestionLivraisons,
  lvdet: DetailsLivraison,
  histo: HistoriqueStatuts,
  notifs: Notifications,
  profil: ProfilParametres,
};
export { Login };
