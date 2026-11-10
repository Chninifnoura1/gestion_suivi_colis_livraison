import Dashboard from "./Dashboard";
import MesLivraisons from "./MesLivraisons";
import DetailsLivraison from "./DetailsLivraison";
import MiseAJourStatut from "./MiseAJourStatut";
import ConfirmationReception from "./ConfirmationReception";
import SignalerProbleme from "./SignalerProbleme";
import Notifications from "./Notifications";
import Profil from "./Profil";
import Login from "./Login";

export const LIVREUR_PAGES = {
  dash: Dashboard,
  liv: MesLivraisons,
  det: DetailsLivraison,
  statut: MiseAJourStatut,
  conf: ConfirmationReception,
  prob: SignalerProbleme,
  notifs: Notifications,
  profil: Profil,
};
export { Login };
