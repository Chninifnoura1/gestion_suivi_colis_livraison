import logging
import re
import uuid

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from db import connect
from repositories.colis_reader import ColisReader
from repositories.notification_repository import NotificationRepository
from senders.email_sender import EmailSender
from services.notification_service import (
    NotFoundError,
    NotificationService,
    UnprocessableError,
)
from templates import STATUS_CODES

logger = logging.getLogger(__name__)
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ValidationError(Exception):
    pass


def _uuid(value, field):
    if not isinstance(value, str):
        raise ValidationError(f"{field} doit être un UUID valide")
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise ValidationError(f"{field} doit être un UUID valide") from None


def _json_value(value):
    if isinstance(value, (uuid.UUID,)):
        return str(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value


def _status_payload(data, require_parcel=True):
    if not isinstance(data, dict):
        raise ValidationError("Le corps JSON est requis")
    parcel_id = _uuid(data.get("colisId"), "colisId") if require_parcel else None
    status_code = data.get("statutCode")
    if not isinstance(status_code, str) or status_code not in STATUS_CODES:
        raise ValidationError("statutCode doit être un code de statut connu")
    for optional in ("localisation", "motif"):
        if optional in data and data[optional] is not None and not isinstance(data[optional], str):
            raise ValidationError(f"{optional} doit être une chaîne de caractères")
    return parcel_id, status_code, data.get("localisation"), data.get("motif")


def create_app(config=None, notification_service=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config:
        app.config.update(config)
    CORS(app)

    if notification_service is None:
        repository = NotificationRepository(connect, app.config)
        reader = ColisReader(connect, app.config)
        notification_service = NotificationService(repository, reader, EmailSender(app.config))
    app.extensions["notification_service"] = notification_service

    @app.before_request
    def require_internal_key():
        if request.method == "POST" and app.config.get("INTERNAL_API_KEY"):
            if request.headers.get("X-Internal-Key") != app.config["INTERNAL_API_KEY"]:
                return jsonify(error="Clé interne invalide ou manquante"), 401
        return None

    @app.errorhandler(ValidationError)
    def handle_validation(error):
        return jsonify(error=str(error)), 400

    @app.errorhandler(NotFoundError)
    def handle_not_found(error):
        return jsonify(error=str(error)), 404

    @app.errorhandler(UnprocessableError)
    def handle_unprocessable(error):
        return jsonify(error=str(error)), 422

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify(error=error.description), error.code

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        logger.exception("Unhandled API error", exc_info=error)
        return jsonify(error="Erreur interne du service"), 500

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    @app.post("/notifications/statut")
    def notify_status():
        colis_id, code, location, reason = _status_payload(request.get_json(silent=True))
        notification = notification_service.creer_pour_statut(
            colis_id, code, localisation=location, motif=reason
        )
        return jsonify(_json_value(notification)), 201

    @app.post("/notifications")
    def create_notification():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            raise ValidationError("Le corps JSON est requis")
        colis_id = _uuid(data.get("colisId"), "colisId")
        message = data.get("message")
        if not isinstance(message, str) or not message.strip():
            raise ValidationError("message est requis")
        email = data.get("emailDestinataire")
        if email is not None and (not isinstance(email, str) or not EMAIL_PATTERN.fullmatch(email)):
            raise ValidationError("emailDestinataire doit être une adresse email valide")
        notification = notification_service.creer(colis_id, message.strip(), email)
        return jsonify(_json_value(notification)), 201

    @app.post("/notifications/livraison/<livraison_id>/statut")
    def notify_delivery(livraison_id):
        delivery_id = _uuid(livraison_id, "livraison_id")
        _, code, location, reason = _status_payload(
            request.get_json(silent=True), require_parcel=False
        )
        return jsonify(
            notification_service.creer_pour_livraison(
                delivery_id, code, localisation=location, motif=reason
            )
        ), 201

    @app.get("/notifications/colis/<colis_id>")
    def list_parcel_notifications(colis_id):
        parcel_id = _uuid(colis_id, "colis_id")
        notifications = notification_service.listerParColis(parcel_id)
        return jsonify(_json_value(notifications))

    @app.get("/notifications/<notification_id>")
    def get_notification(notification_id):
        parsed_id = _uuid(notification_id, "id")
        return jsonify(_json_value(notification_service.obtenir(parsed_id)))

    @app.post("/notifications/<notification_id>/renvoyer")
    def resend_notification(notification_id):
        parsed_id = _uuid(notification_id, "id")
        notification = notification_service.envoyer(parsed_id)
        return jsonify(_json_value(notification)), 200

    return app


app = create_app()


if __name__ == "__main__":
    from db import wait_for_database

    logging.basicConfig(level=logging.INFO)
    wait_for_database(app.config)
    app.run(host="0.0.0.0", port=app.config["PORT"])
