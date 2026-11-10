import sys
from pathlib import Path
from unittest.mock import Mock
import uuid

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from services.notification_service import NotificationService
from templates import build_status_message

PARCEL_ID = uuid.UUID("33333333-3333-4333-8333-333333333333")
NOTIFICATION_ID = uuid.UUID("77777777-7777-4777-8777-777777777777")
PARCEL = {
    "id": PARCEL_ID,
    "numero_suivi": "SC-2026-DEMO-001",
    "destinataire_nom": "Sara Alaoui",
    "destinataire_email": "sara.demo@example.com",
}


@pytest.mark.parametrize(
    ("code", "expected"),
    [
        ("CREE", "Bonjour Sara Alaoui, votre colis SC-2026-DEMO-001 a été enregistré."),
        (
            "EN_ATTENTE",
            "Bonjour Sara Alaoui, votre colis SC-2026-DEMO-001 est en attente de prise en charge.",
        ),
        (
            "PRIS_EN_CHARGE",
            "Bonjour Sara Alaoui, votre colis SC-2026-DEMO-001 a été pris en charge par le livreur.",
        ),
        (
            "EN_COURS",
            "Bonjour Sara Alaoui, votre colis SC-2026-DEMO-001 est en cours de livraison.",
        ),
        (
            "ECHEC",
            "Bonjour Sara Alaoui, la livraison de votre colis SC-2026-DEMO-001 a échoué.",
        ),
        (
            "NOUVELLE_TENTATIVE",
            "Bonjour Sara Alaoui, une nouvelle tentative de livraison de votre colis SC-2026-DEMO-001 est prévue.",
        ),
        (
            "LIVRE",
            "Bonjour Sara Alaoui, votre colis SC-2026-DEMO-001 a été livré. Merci de votre confiance.",
        ),
    ],
)
def test_build_status_message(code, expected):
    assert build_status_message(code, PARCEL["destinataire_nom"], PARCEL["numero_suivi"]) == expected


def test_failure_reason_and_location_are_appended():
    assert build_status_message(
        "ECHEC", "Sara Alaoui", "SC-2026-DEMO-001", reason="absente", location="Marrakech"
    ) == (
        "Bonjour Sara Alaoui, la livraison de votre colis SC-2026-DEMO-001 a échoué : absente."
        " Localisation : Marrakech."
    )


def _notification(status="EN_ATTENTE"):
    return {
        "id": NOTIFICATION_ID,
        "colis_id": PARCEL_ID,
        "email_destinataire": PARCEL["destinataire_email"],
        "type": "EMAIL",
        "message": "Test message",
        "statut_envoi": status,
        "date_creation": None,
        "date_envoi": None,
    }


def test_send_failure_is_saved_and_does_not_escape_service():
    repository = Mock()
    reader = Mock()
    sender = Mock()
    repository.create.return_value = _notification()
    repository.set_delivery_result.return_value = _notification("ECHEC")
    reader.get_recipient.return_value = PARCEL
    sender.send.side_effect = RuntimeError("SMTP offline")
    service = NotificationService(repository, reader, sender)

    result = service.creer_pour_statut(PARCEL_ID, "CREE")

    assert result["statut_envoi"] == "ECHEC"
    repository.set_delivery_result.assert_called_once_with(NOTIFICATION_ID, "ECHEC")


def test_send_success_marks_notification_sent():
    repository = Mock()
    reader = Mock()
    sender = Mock()
    repository.create.return_value = _notification()
    repository.set_delivery_result.return_value = _notification("ENVOYEE")
    reader.get_recipient.return_value = PARCEL
    service = NotificationService(repository, reader, sender)

    result = service.creer_pour_statut(PARCEL_ID, "CREE")

    assert result["statut_envoi"] == "ENVOYEE"
    repository.set_delivery_result.assert_called_once_with(NOTIFICATION_ID, "ENVOYEE")


def test_invalid_status_and_uuid_return_json_400():
    service = Mock()
    client = create_app({"TESTING": True}, notification_service=service).test_client()

    bad_uuid = client.post(
        "/notifications/statut",
        json={"colisId": "not-a-uuid", "statutCode": "CREE"},
    )
    bad_status = client.post(
        "/notifications/statut",
        json={"colisId": str(PARCEL_ID), "statutCode": "UNKNOWN"},
    )

    assert bad_uuid.status_code == 400
    assert "colisId" in bad_uuid.json["error"]
    assert bad_status.status_code == 400
    service.creer_pour_statut.assert_not_called()


def test_invalid_email_returns_json_400():
    service = Mock()
    client = create_app({"TESTING": True}, notification_service=service).test_client()

    response = client.post(
        "/notifications",
        json={"colisId": str(PARCEL_ID), "message": "Hello", "emailDestinataire": "invalid"},
    )

    assert response.status_code == 400
    assert "email" in response.json["error"]
    service.creer.assert_not_called()


def test_write_endpoints_require_internal_key_when_configured():
    client = create_app(
        {"TESTING": True, "INTERNAL_API_KEY": "test-key"},
        notification_service=Mock(),
    ).test_client()

    response = client.post("/notifications", json={})

    assert response.status_code == 401
