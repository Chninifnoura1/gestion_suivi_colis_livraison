import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services import statut_service


AGENCE_A = uuid.uuid4()
AGENCE_B = uuid.uuid4()
USER_ID = uuid.uuid4()
COLIS_ID = str(uuid.uuid4())

client = TestClient(app)


def make_user(role, agence_id=AGENCE_A):
    return {"id": USER_ID, "agence_id": agence_id, "is_active": True, "role": role}


def make_colis(actuelle=AGENCE_A, destination=AGENCE_B, deja_arrive=False):
    return {
        "agence_actuelle_id": actuelle,
        "agence_destination_id": destination,
        "deja_arrive": deja_arrive,
    }


def make_db(colis, mission=None):
    """Fausse base : 1er execute = le colis, 2eme execute = la mission."""
    premier = MagicMock()
    premier.mappings.return_value.first.return_value = colis
    second = MagicMock()
    second.first.return_value = mission
    db = MagicMock()
    db.execute.side_effect = [premier, second]
    return db


@pytest.fixture
def appels(monkeypatch):
    """Le colis existe, et create_statut est remplace par un faux
    qui enregistre l'appel puis leve ValueError (donc reponse 422).
    Un 422 'acces accorde' prouve que toutes les verifications sont passees."""
    liste = []

    def faux_create(db, data):
        liste.append(data)
        raise ValueError("stop")

    monkeypatch.setattr(statut_service, "colis_exists", lambda colis_id: True)
    monkeypatch.setattr(statut_service, "create_statut", faux_create)
    yield liste
    app.dependency_overrides.clear()


def lancer(user, db, code, **extra):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    return client.post(
        "/api/v1/statuts/",
        json={"colis_id": COLIS_ID, "code": code, **extra},
    )


def test_colis_absent_de_la_base(appels):
    r = lancer(make_user("ADMIN"), make_db(None), "EN_COURS")
    assert r.status_code == 404


def test_admin_sans_agence(appels):
    r = lancer(make_user("ADMIN", agence_id=None), make_db(make_colis()), "EN_COURS")
    assert r.status_code == 403


def test_admin_phase_depart_statut_autorise(appels):
    r = lancer(make_user("ADMIN"), make_db(make_colis()), "EN_COURS")
    assert r.status_code == 422
    assert len(appels) == 1


def test_utilisateur_id_vient_du_token(appels):
    lancer(make_user("ADMIN"), make_db(make_colis()), "EN_COURS", utilisateur_id=str(uuid.uuid4()))
    assert appels[0].utilisateur_id == USER_ID


def test_admin_phase_arrivee_statut_autorise(appels):
    colis = make_colis(actuelle=AGENCE_A, destination=AGENCE_A, deja_arrive=True)
    r = lancer(make_user("ADMIN"), make_db(colis), "NOUVELLE_TENTATIVE")
    assert r.status_code == 422
    assert len(appels) == 1


def test_admin_phase_arrivee_statut_refuse(appels):
    colis = make_colis(actuelle=AGENCE_A, destination=AGENCE_A, deja_arrive=True)
    r = lancer(make_user("ADMIN"), make_db(colis), "CREE")
    assert r.status_code == 403


def test_super_admin_refuse(appels):
    r = lancer(make_user("SUPER_ADMIN"), make_db(make_colis()), "EN_COURS")
    assert r.status_code == 403


def test_role_inconnu_refuse(appels):
    r = lancer(make_user("CLIENT"), make_db(make_colis()), "EN_COURS")
    assert r.status_code == 403


def test_livreur_statut_non_autorise(appels):
    r = lancer(make_user("LIVREUR"), make_db(make_colis()), "EN_COURS")
    assert r.status_code == 403


def test_livreur_transport_sans_mission(appels):
    r = lancer(make_user("LIVREUR"), make_db(make_colis(), mission=None), "ARRIVEE_A_L_AGENCE")
    assert r.status_code == 403


def test_livreur_transport_avec_mission(appels):
    r = lancer(make_user("LIVREUR"), make_db(make_colis(), mission=("id",)), "ARRIVEE_A_L_AGENCE")
    assert r.status_code == 422
    assert len(appels) == 1


def test_livreur_livraison_sans_mission(appels):
    r = lancer(make_user("LIVREUR"), make_db(make_colis(), mission=None), "LIVRE")
    assert r.status_code == 403


def test_livreur_livraison_avec_mission(appels):
    r = lancer(make_user("LIVREUR"), make_db(make_colis(), mission=("id",)), "LIVRE")
    assert r.status_code == 422
    assert len(appels) == 1


def test_livreur_echec_avec_mission(appels):
    r = lancer(
        make_user("LIVREUR"),
        make_db(make_colis(), mission=("id",)),
        "ECHEC",
        motif_echec="Destinataire absent",
    )
    assert r.status_code == 422
    assert len(appels) == 1
