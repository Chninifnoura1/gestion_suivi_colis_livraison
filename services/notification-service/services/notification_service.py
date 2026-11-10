import logging
import re

from templates import build_status_message

logger = logging.getLogger(__name__)
NOTIFICATION_TYPE = "EMAIL"
STATUS_PENDING = "EN_ATTENTE"
STATUS_SENT = "ENVOYEE"
STATUS_FAILED = "ECHEC"
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class NotFoundError(Exception):
    pass


class UnprocessableError(Exception):
    pass


class NotificationService:
    def __init__(self, notification_repository, colis_reader, email_sender):
        self.notifications = notification_repository
        self.colis = colis_reader
        self.email_sender = email_sender

    def creer(self, colis_id, message, email_destinataire=None):
        parcel = self._get_parcel(colis_id)
        email = email_destinataire or parcel["destinataire_email"]
        self._require_email(email)
        notification = self.notifications.create(colis_id, email, NOTIFICATION_TYPE, message)
        return self._send_created(notification)

    def creer_pour_statut(self, colis_id, statut_code, localisation=None, motif=None):
        parcel = self._get_parcel(colis_id)
        self._require_email(parcel["destinataire_email"])
        message = build_status_message(
            statut_code,
            parcel["destinataire_nom"],
            parcel["numero_suivi"],
            reason=motif,
            location=localisation,
        )
        notification = self.notifications.create(
            colis_id, parcel["destinataire_email"], NOTIFICATION_TYPE, message
        )
        return self._send_created(notification)

    def creer_pour_livraison(self, livraison_id, statut_code, localisation=None, motif=None):
        result = {"created": 0, "sent": 0, "failed": 0}
        for colis_id in self.colis.list_by_delivery(livraison_id):
            try:
                notification = self.creer_pour_statut(colis_id, statut_code, localisation, motif)
                result["created"] += 1
                if notification["statut_envoi"] == STATUS_SENT:
                    result["sent"] += 1
                else:
                    result["failed"] += 1
            except (NotFoundError, UnprocessableError):
                logger.exception("Could not create delivery notification for parcel %s", colis_id)
                result["failed"] += 1
        return result

    def envoyer(self, notification_id):
        notification = self.notifications.get(notification_id)
        if notification is None:
            raise NotFoundError("Notification introuvable")
        if notification["statut_envoi"] != STATUS_FAILED:
            raise UnprocessableError("Seules les notifications en échec peuvent être renvoyées")
        notification = self.notifications.set_delivery_result(notification_id, STATUS_PENDING)
        return self._send_created(notification)

    def listerParColis(self, colisId):
        return self.notifications.list_by_parcel(colisId)

    def obtenir(self, notification_id):
        notification = self.notifications.get(notification_id)
        if notification is None:
            raise NotFoundError("Notification introuvable")
        return notification

    def _get_parcel(self, colis_id):
        parcel = self.colis.get_recipient(colis_id)
        if parcel is None:
            raise NotFoundError("Colis introuvable")
        return parcel

    @staticmethod
    def _require_email(email):
        if not isinstance(email, str) or not EMAIL_PATTERN.fullmatch(email):
            raise UnprocessableError(
                "Le colis ne possède pas d'adresse email destinataire valide"
            )

    def _send_created(self, notification):
        try:
            self.email_sender.send(
                notification["email_destinataire"],
                "Mise à jour de votre colis",
                notification["message"],
            )
        except Exception:
            logger.exception("Email delivery failed for notification %s", notification["id"])
            return self.notifications.set_delivery_result(notification["id"], STATUS_FAILED)
        return self.notifications.set_delivery_result(notification["id"], STATUS_SENT)
