
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import engine, get_db
from app.dependencies.auth import get_current_user
from app.services import statut_service


AGENCE_AGADIR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
ADMIN_ID = "11111111-1111-4111-8111-111111111111"
FAKE_ADMIN = {
    "id": uuid.UUID(ADMIN_ID),
    "agence_id": uuid.UUID(AGENCE_AGADIR_ID),
    "is_active": True,
    "role": "ADMIN",
}
CURRENT_COLIS_ID = None


@pytest.fixture(autouse=True)
def isolate_database_and_external_services(monkeypatch):
    global CURRENT_COLIS_ID

    connection = engine.connect()
    transaction = connection.begin()

    colis_id = uuid.uuid4()
    numero_suivi = f"TEST-{colis_id}"

    # Create a temporary parcel inside the test transaction
    connection.execute(
        text("""
            INSERT INTO colis.colis (
                id,
                numero_suivi,
                poids,
                agence_expedition_id, agence_actuelle_id,
                expediteur_nom,
                expediteur_telephone,
                expediteur_adresse,
                expediteur_ville,
                destinataire_nom,
                destinataire_telephone,
                destinataire_email,
                destinataire_adresse,
                destinataire_ville
            )
            VALUES (
                :id,
                :numero_suivi,
                1.00,
                :agence_id, :agence_id,
                'Expediteur Test',
                '0600000000',
                'Adresse Test',
                'Agadir',
                'Destinataire Test',
                '0611111111',
                'test@example.com',
                'Adresse Destination',
                'Marrakech'
            )
        """),
        {
            "id": colis_id,
            "numero_suivi": numero_suivi,
            "agence_id": AGENCE_AGADIR_ID,
        },
    )

    CURRENT_COLIS_ID = str(colis_id)

    TestSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=connection,
    )

    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: FAKE_ADMIN

    monkeypatch.setattr(
        statut_service,
        "colis_exists",
        lambda colis_id: True,
    )
    monkeypatch.delenv("NOTIFICATION_SERVICE_URL", raising=False)

    yield

    app.dependency_overrides.clear()
    CURRENT_COLIS_ID = None
    transaction.rollback()
    connection.close()


client = TestClient(app)


def new_colis_id() -> str:
    return CURRENT_COLIS_ID


def post_statut(colis_id, code, **extra):
    return client.post(
        "/api/v1/statuts/",
        json={"colis_id": colis_id, "code": code, **extra},
    )


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_statut_ok():
    colis_id = new_colis_id()
    response = post_statut(
        colis_id,
        "EN_COURS",
        localisation="Casablanca",
        commentaire="Pris en charge",
    )
    assert response.status_code == 201
    body = response.json()
    assert body["colis_id"] == colis_id
    assert body["code"] == "EN_COURS"
    assert body["libelle"]
    assert body["localisation"] == "Casablanca"
    assert body["utilisateur_id"] == ADMIN_ID


def test_create_statut_echec_refuse_a_un_admin():
    """ECHEC est reserve aux livreurs : un ADMIN recoit 403"""
    response = post_statut(
        new_colis_id(),
        "ECHEC",
        motif_echec="Destinataire absent",
    )
    assert response.status_code == 403


def test_create_statut_code_invalide():
    response = post_statut(new_colis_id(), "INCONNU")
    assert response.status_code == 422


def test_create_statut_sans_colis_id():
    response = client.post("/api/v1/statuts/", json={"code": "LIVRE"})
    assert response.status_code == 422


def test_create_statut_colis_introuvable(monkeypatch):
    monkeypatch.setattr(
        statut_service,
        "colis_exists",
        lambda colis_id: False,
    )
    response = post_statut(new_colis_id(), "LIVRE")
    assert response.status_code == 404


def test_create_statut_service_colis_indisponible(monkeypatch):
    monkeypatch.setattr(
        statut_service,
        "colis_exists",
        lambda colis_id: None,
    )
    response = post_statut(new_colis_id(), "LIVRE")
    assert response.status_code == 503


def test_statut_actuel_est_le_dernier():
    colis_id = new_colis_id()
    post_statut(colis_id, "CREE")
    post_statut(colis_id, "PRIS_EN_CHARGE")
    post_statut(colis_id, "EN_COURS")

    response = client.get(
        f"/api/v1/statuts/colis/{colis_id}/actuel"
    )
    assert response.status_code == 200
    assert response.json()["code"] == "EN_COURS"


def test_statut_actuel_colis_sans_statut():
    response = client.get(
        f"/api/v1/statuts/colis/{new_colis_id()}/actuel"
    )
    assert response.status_code == 404


def test_historique_dans_l_ordre():
    colis_id = new_colis_id()
    etapes = ["CREE", "PRIS_EN_CHARGE", "EN_COURS"]

    for etape in etapes:
        post_statut(colis_id, etape)

    response = client.get(
        f"/api/v1/statuts/colis/{colis_id}/historique"
    )
    assert response.status_code == 200
    assert [s["code"] for s in response.json()] == etapes


def test_historique_colis_sans_statut():
    response = client.get(
        f"/api/v1/statuts/colis/{new_colis_id()}/historique"
    )
    assert response.status_code == 200
    assert response.json() == []


def test_colis_id_invalide():
    response = client.get(
        "/api/v1/statuts/colis/abc/actuel"
    )
    assert response.status_code == 422


def test_create_statut_sans_token():
    """Sans connexion : 401"""
    app.dependency_overrides.pop(get_current_user)
    response = post_statut(new_colis_id(), "EN_COURS")
    assert response.status_code == 401


def test_create_statut_admin_autre_agence():
    """Un ADMIN d'une autre agence ne peut pas modifier ce colis : 403"""
    app.dependency_overrides[get_current_user] = lambda: {
        **FAKE_ADMIN,
        "agence_id": uuid.uuid4(),
    }
    response = post_statut(new_colis_id(), "EN_COURS")
    assert response.status_code == 403

