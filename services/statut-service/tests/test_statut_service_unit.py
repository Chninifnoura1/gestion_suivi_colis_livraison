"""
Unit tests for app/services/statut_service.py
No server, no real database: the DB session and httpx are replaced by fakes.
"""
import uuid
from unittest.mock import MagicMock

import httpx
import pytest

from app.models.statut import Statut
from app.schemas.statut import StatutCreate
from app.services import statut_service


# ---------- helpers ----------
class FakeResponse:
    def __init__(self, status_code, data=None):
        self.status_code = status_code
        self.data = data or {}

    def json(self):
        return self.data


def test_colis_exists_sans_configuration(monkeypatch):
    monkeypatch.delenv("COLIS_SERVICE_URL", raising=False)
    monkeypatch.delenv("INTERNAL_API_KEY", raising=False)

    assert statut_service.colis_exists(uuid.uuid4()) is None


def test_colis_exists_colis_trouve(monkeypatch):
    monkeypatch.setenv("COLIS_SERVICE_URL", "http://fake")
    monkeypatch.setenv("INTERNAL_API_KEY", "test-key")
    monkeypatch.setattr(
        statut_service.httpx,
        "get",
        lambda *a, **k: FakeResponse(200, {"exists": True}),
    )

    assert statut_service.colis_exists(uuid.uuid4()) is True


def test_colis_exists_colis_introuvable(monkeypatch):
    monkeypatch.setenv("COLIS_SERVICE_URL", "http://fake")
    monkeypatch.setenv("INTERNAL_API_KEY", "test-key")
    monkeypatch.setattr(
        statut_service.httpx,
        "get",
        lambda *a, **k: FakeResponse(404),
    )

    assert statut_service.colis_exists(uuid.uuid4()) is False


def test_colis_exists_service_indisponible(monkeypatch):
    monkeypatch.setenv("COLIS_SERVICE_URL", "http://fake")
    monkeypatch.setenv("INTERNAL_API_KEY", "test-key")

    def boom(*a, **k):
        raise statut_service.httpx.ConnectError("down")

    monkeypatch.setattr(statut_service.httpx, "get", boom)

    assert statut_service.colis_exists(uuid.uuid4()) is None


def test_colis_exists_service_en_erreur_500(monkeypatch):
    monkeypatch.setenv("COLIS_SERVICE_URL", "http://fake")
    monkeypatch.setenv("INTERNAL_API_KEY", "test-key")
    monkeypatch.setattr(
        statut_service.httpx,
        "get",
        lambda *a, **k: FakeResponse(500),
    )

    assert statut_service.colis_exists(uuid.uuid4()) is None


# ---------- create_statut ----------
def test_create_statut_enregistre_en_base(monkeypatch):
    """Normal case: the history row is added, committed and returned"""
    monkeypatch.setattr(statut_service, "notify_status_change", lambda s: None)
    db = make_db(make_ref("LIVRE", "Livre"))
    data = make_data("LIVRE")

    result = statut_service.create_statut(db, data)

    assert result.code == "LIVRE"
    assert result.libelle == "Livre"
    assert result.colis_id == data.colis_id
    db.add.assert_called_once()
    db.commit.assert_called_once()


def test_create_statut_notifie_le_service_notification(monkeypatch):
    """Normal case: the notification service is told about the change"""
    appels = []
    monkeypatch.setattr(statut_service, "notify_status_change", appels.append)

    result = statut_service.create_statut(make_db(make_ref()), make_data())

    assert appels == [result]


def test_create_statut_notification_en_panne(monkeypatch):
    """Error case: notification service down -> status still created"""
    monkeypatch.setenv("NOTIFICATION_SERVICE_URL", "http://fake")

    def boom(*a, **k):
        raise httpx.ConnectError("notification down")

    monkeypatch.setattr(statut_service.httpx, "post", boom)

    result = statut_service.create_statut(
        make_db(make_ref("ECHEC", "Echec de livraison")),
        make_data("ECHEC"),
    )

    assert result.code == "ECHEC"


def test_create_statut_code_inconnu_en_base():
    """Error case: code missing from statut.statuts -> ValueError, nothing saved"""
    db = make_db(None)

    with pytest.raises(ValueError):
        statut_service.create_statut(db, make_data("LIVRE"))

    db.add.assert_not_called()
    db.commit.assert_not_called()


# ---------- get_current_statut ----------
def test_get_current_statut_retourne_le_dernier():
    """Normal case: returns what the DB gives as latest status"""
    db = MagicMock()
    dernier = MagicMock(code="LIVRE")
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = dernier

    assert statut_service.get_current_statut(db, uuid.uuid4()) is dernier


def test_get_current_statut_colis_sans_statut():
    """Edge case: parcel with no status -> None"""
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None

    assert statut_service.get_current_statut(db, uuid.uuid4()) is None


# ---------- get_history ----------
def test_get_history_retourne_la_liste():
    """Normal case: history returned as a list"""
    db = MagicMock()
    liste = [MagicMock(code="CREE"), MagicMock(code="LIVRE")]
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = liste

    assert statut_service.get_history(db, uuid.uuid4()) == liste


def test_get_history_colis_sans_statut():
    """Edge case: parcel with no status -> empty list"""
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

    assert statut_service.get_history(db, uuid.uuid4()) == []
