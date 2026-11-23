
import sys
from pathlib import Path
from unittest.mock import Mock
import uuid

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from services.notification_service import NotificationService
from templates import build_status_message, build_status_subject


PARCEL_ID = uuid.UUID("33333333-3333-4333-8333-333333333333")
NOTIFICATION_ID = uuid.UUID("77777777-7777-4777-8777-777777777777")

PARCEL = {
    "id": PARCEL_ID,
    "numero_suivi": "SC-2026-DEMO-001",
    "destinataire_nom": "Sara Alaoui",
    "destinataire_email": "sara.demo@example.com",
}


ECHEC_MESSAGE = (
    "Bonjour,\n\n"
    "Nous vous informons que la livraison de votre colis n'a pas pu aboutir.\n\n"
    "Nous vous invitons à contacter votre agence afin d'organiser une nouvelle tentative de livraison.\n\n"
    "Merci de votre compréhension.\n\n"
    "ColisTrack"
)

LIVRE_MESSAGE = (
    "Bonjour,\n\n"
    "Nous vous confirmons que votre colis a été livré avec succès.\n\n"
    "Nous vous remercions d'avoir choisi notre service.\n\n"
    "ColisTrack"
)


def _notification(status="EN_ATTENTE", event="LIVRE", message="Test message"):
    return {
        "id": NOTIFICATION_ID,
        "colis_id": PARCEL_ID,
        "email_destinataire": PARCEL["destinataire_email"],
        "type": "EMAIL",
        "message": message,
        "statut_envoi": status,
        "date_creation": None,
        "date_envoi": None,
        "evenement": event,
    }


def _make_service():
    repository = Mock()
    reader = Mock()
    sender = Mock()

    repository.get_notification_by_event.return_value = None

    repository.create.side_effect = (
        lambda *args, **kwargs: _notification(
            event=kwargs.get("evenement"),
            message=args[3],
        )
    )

    repository.set_delivery_result.side_effect = (
        lambda notification_id, status: _notification(status)
    )

    reader.get_recipient.return_value = PARCEL

    service = NotificationService(repository, reader, sender)

    return service, repository, reader, sender


def test_failure_message_is_correct():
    assert build_status_message(
        "ECHEC", PARCEL["destinataire_nom"], PARCEL["numero_suivi"]
    ) == ECHEC_MESSAGE

    assert build_status_subject("ECHEC") == "Échec de livraison de votre colis"


def test_success_message_is_correct():
    assert build_status_message(
        "LIVRE", PARCEL["destinataire_nom"], PARCEL["numero_suivi"]
    ) == LIVRE_MESSAGE

    assert build_status_subject("LIVRE") == "Confirmation de livraison de votre colis"


@pytest.mark.parametrize(
    "code",
    [
        "CREE",
        "EN_ATTENTE",
        "PRIS_EN_CHARGE",
        "EN_COURS",
        "NOUVELLE_TENTATIVE",
        "ARRIVEE_A_L_AGENCE",
    ],
)
def test_non_delivery_status_does_not_send_email(code):
    service, repository, reader, sender = _make_service()

    result = service.creer_pour_statut(PARCEL_ID, code)

    assert result is None
    repository.create.assert_not_called()
    repository.get_notification_by_event.assert_not_called()
    reader.get_recipient.assert_not_called()
    sender.send.assert_not_called()


def test_failure_notification_is_created_and_sent():
    service, repository, reader, sender = _make_service()

    repository.create.return_value = _notification(event="ECHEC")
    repository.set_delivery_result.return_value = _notification(
        "ENVOYEE", event="ECHEC"
    )

    result = service.creer_pour_statut(
        PARCEL_ID, "ECHEC", localisation="Marrakech", motif="absente"
    )

    assert result["statut_envoi"] == "ENVOYEE"

    repository.get_notification_by_event.assert_called_once_with(
        PARCEL_ID, "ECHEC"
    )
    repository.create.assert_called_once()

    assert repository.create.call_args.kwargs["evenement"] == "ECHEC"
    assert repository.create.call_args.args[3] == ECHEC_MESSAGE

    sender.send.assert_called_once_with(
        PARCEL["destinataire_email"],
        "Échec de livraison de votre colis",
        ECHEC_MESSAGE,
    )


def test_delivery_notification_is_created_and_sent():
    service, repository, reader, sender = _make_service()

    repository.create.return_value = _notification(event="LIVRE")
    repository.set_delivery_result.return_value = _notification(
        "ENVOYEE", event="LIVRE"
    )

    result = service.creer_pour_statut(PARCEL_ID, "LIVRE")

    assert result["statut_envoi"] == "ENVOYEE"

    repository.get_notification_by_event.assert_called_once_with(
        PARCEL_ID, "LIVRE"
    )
    repository.create.assert_called_once()

    assert repository.create.call_args.kwargs["evenement"] == "LIVRE"
    assert repository.create.call_args.args[3] == LIVRE_MESSAGE

    sender.send.assert_called_once_with(
        PARCEL["destinataire_email"],
        "Confirmation de livraison de votre colis",
        LIVRE_MESSAGE,
    )


@pytest.mark.parametrize("code", ["ECHEC", "LIVRE"])
def test_existing_event_notification_is_not_sent_again(code):
    service, repository, reader, sender = _make_service()

    existing = _notification("ENVOYEE", event=code)
    repository.get_notification_by_event.return_value = existing

    result = service.creer_pour_statut(PARCEL_ID, code)

    assert result == existing
    repository.create.assert_not_called()
    reader.get_recipient.assert_not_called()
    sender.send.assert_not_called()


@pytest.mark.parametrize("code", ["ECHEC", "LIVRE"])
def test_email_failure_is_saved(code):
    service, repository, reader, sender = _make_service()

    repository.create.return_value = _notification(event=code)
    repository.set_delivery_result.return_value = _notification(
        "ECHEC", event=code
    )
    sender.send.side_effect = RuntimeError("SMTP offline")

    result = service.creer_pour_statut(PARCEL_ID, code)

    assert result["statut_envoi"] == "ECHEC"
    repository.create.assert_called_once()
    repository.set_delivery_result.assert_called_once_with(
        NOTIFICATION_ID, "ECHEC"
    )


def test_invalid_status_and_uuid_return_json_400():
    service = Mock()
    client = create_app(
    {"TESTING": True, "INTERNAL_API_KEY": ""},
    notification_service=service
    ).test_client()

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
    client = create_app(
        {"TESTING": True, "INTERNAL_API_KEY": ""},
        notification_service=service
    ).test_client()

    response = client.post(
        "/notifications",
        json={
            "colisId": str(PARCEL_ID),
            "message": "Hello",
            "emailDestinataire": "invalid",
        },
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
