
import logging
import re

from templates import build_status_message, build_status_subject

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

    def creer_notification_livreur(
        self, livreur_id, livraison_id, title, message,
        category="Affectation"
    ):
        notification = self.notifications.create_courier_notification(
            livreur_id=livreur_id,
            livraison_id=livraison_id,
            title=title,
            message=message,
            category=category,
        )

        if notification is None:
            logger.info(
                "Courier notification already exists for mission %s and courier %s",
                livraison_id,
                livreur_id,
            )

        return notification


    def creer_notification_admin(
        self, admin_id, agence_id, livraison_id, title, message,
        category="Système"
    ):
        notification = self.notifications.create_admin_notification(
            admin_id=admin_id,
            agence_id=agence_id,
            livraison_id=livraison_id,
            title=title,
            message=message,
            category=category,
        )

        if notification is None:
            logger.info(
                "Admin notification already exists for mission %s and agency %s",
                livraison_id,
                agence_id,
            )

        return notification
 
    def creer(self, colis_id, message, email_destinataire=None, livraison_id=None):
        parcel = self._get_parcel(colis_id)
        email = email_destinataire or parcel["destinataire_email"]
        self._require_email(email)
        notification = self.notifications.create(
            colis_id, email, NOTIFICATION_TYPE, message, livraison_id=livraison_id
        )
        return self._send_created(notification)


    def creer_pour_statut(
        self, colis_id, statut_code, localisation=None, motif=None, livraison_id=None
    ):
        # Notify customers only for failed or successful deliveries.
        if statut_code not in ("ECHEC", "LIVRE"):
            return None

        # Prevent duplicate notifications for the same event.
        existing = self.notifications.get_notification_by_event(
            colis_id, statut_code
        )
        if existing is not None:
            return existing

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
            colis_id,
            parcel["destinataire_email"],
            NOTIFICATION_TYPE,
            message,
            livraison_id=livraison_id,
            evenement=statut_code,
        )

        # Handle simultaneous requests safely.
        if notification is None:
            existing = self.notifications.get_notification_by_event(
                colis_id, statut_code
            )
            if existing is not None:
                return existing
            raise RuntimeError("Impossible de créer la notification")

        return self._send_created(notification)


    def creer_pour_arrivee_agence(
        self, colis_id, livraison_id=None, localisation=None
    ):
        evenement = "ARRIVEE_A_L_AGENCE"

        # Eviter les notifications en double.
        existing = self.notifications.get_notification_by_event(
            colis_id, evenement
        )

        if existing is not None:
            if existing["statut_envoi"] == STATUS_FAILED:
                return self.envoyer(existing["id"])
            return existing

        parcel = self._get_parcel(colis_id)
        self._require_email(parcel["destinataire_email"])

        message = build_status_message(
            evenement,
            parcel["destinataire_nom"],
            parcel["numero_suivi"],
            location=localisation,
        )

        notification = self.notifications.create(
            colis_id,
            parcel["destinataire_email"],
            NOTIFICATION_TYPE,
            message,
            livraison_id=livraison_id,
            evenement=evenement,
        )

        # Une autre requête a peut-être créé la notification simultanément.
        if notification is None:
            existing = self.notifications.get_notification_by_event(
                colis_id, evenement
            )
            if existing is not None:
                if existing["statut_envoi"] == STATUS_FAILED:
                    return self.envoyer(existing["id"])
                return existing

            raise RuntimeError(
                "Impossible de créer la notification d'arrivée à l'agence"
            )

        return self._send_created(notification)

    def creer_pour_livraison(
        self, livraison_id, statut_code, localisation=None, motif=None
    ):
        result = {"created": 0, "sent": 0, "failed": 0}

        for colis_id in self.colis.list_by_delivery(livraison_id):
            try:
                notification = self.creer_pour_statut(
                    colis_id,
                    statut_code,
                    localisation,
                    motif,
                    livraison_id=livraison_id,
                )

                if notification is None:
                    continue

                result["created"] += 1
                if notification["statut_envoi"] == STATUS_SENT:
                    result["sent"] += 1
                else:
                    result["failed"] += 1

            except (NotFoundError, UnprocessableError):
                logger.exception(
                    "Could not create delivery notification for parcel %s",
                    colis_id,
                )
                result["failed"] += 1

        return result

    def envoyer(self, notification_id):
        notification = self.notifications.get(notification_id)
        if notification is None:
            raise NotFoundError("Notification introuvable")
        if notification["statut_envoi"] != STATUS_FAILED:
            raise UnprocessableError(
                "Seules les notifications en échec peuvent être renvoyées"
            )
        notification = self.notifications.set_delivery_result(
            notification_id, STATUS_PENDING
        )
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
            subject = build_status_subject(notification.get("evenement"))
            self.email_sender.send(
                notification["email_destinataire"],
                subject,
                notification["message"],
            )
        except Exception:
            logger.exception(
                "Email delivery failed for notification %s", notification["id"]
            )
            return self.notifications.set_delivery_result(
                notification["id"], STATUS_FAILED
            )

        return self.notifications.set_delivery_result(
            notification["id"], STATUS_SENT
        )

