class NotificationRepository:
    def __init__(self, connection_factory, config):
        self.connection_factory = connection_factory
        self.config = config

    def create(self, colis_id, email, notification_type, message):
        query = """
            INSERT INTO notification.notifications
                (colis_id, email_destinataire, type, message, statut_envoi)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, colis_id, email_destinataire, type, message,
                      statut_envoi, date_creation, date_envoi
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query,
                (colis_id, email, notification_type, message, "EN_ATTENTE"),
            ).fetchone()

    def set_delivery_result(self, notification_id, status):
        query = """
            UPDATE notification.notifications
            SET statut_envoi = %s,
                date_envoi = CASE WHEN %s = 'ENVOYEE' THEN NOW() ELSE NULL END
            WHERE id = %s
            RETURNING id, colis_id, email_destinataire, type, message,
                      statut_envoi, date_creation, date_envoi
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(query, (status, status, notification_id)).fetchone()

    def get(self, notification_id):
        query = """
            SELECT id, colis_id, email_destinataire, type, message,
                   statut_envoi, date_creation, date_envoi
            FROM notification.notifications
            WHERE id = %s
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(query, (notification_id,)).fetchone()

    def list_by_parcel(self, colis_id):
        query = """
            SELECT id, colis_id, email_destinataire, type, message,
                   statut_envoi, date_creation, date_envoi
            FROM notification.notifications
            WHERE colis_id = %s
            ORDER BY date_creation DESC
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(query, (colis_id,)).fetchall()
