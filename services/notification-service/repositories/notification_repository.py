
class NotificationRepository:
    def __init__(self, connection_factory, config):
        self.connection_factory = connection_factory
        self.config = config

    def create(
        self, colis_id, email, notification_type, message,
        livraison_id=None, evenement=None
    ):
        query = """
            INSERT INTO notification.notifications
                (colis_id, livraison_id, email_destinataire, type,
                 message, statut_envoi, evenement)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id, colis_id, livraison_id, email_destinataire, type,
                      message, statut_envoi, date_creation, date_envoi, evenement
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query,
                (
                    colis_id, livraison_id, email, notification_type,
                    message, "EN_ATTENTE", evenement,
                ),
            ).fetchone()

    def set_delivery_result(self, notification_id, status):
        query = """
            UPDATE notification.notifications
            SET statut_envoi = %s,
                date_envoi = CASE WHEN %s = 'ENVOYEE' THEN NOW() ELSE NULL END
            WHERE id = %s
            RETURNING id, colis_id, livraison_id, email_destinataire, type,
                      message, statut_envoi, date_creation, date_envoi, evenement
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query, (status, status, notification_id)
            ).fetchone()

    def get(self, notification_id):
        query = """
            SELECT id, colis_id, livraison_id, email_destinataire, type,
                   message, statut_envoi, date_creation, date_envoi, evenement
            FROM notification.notifications
            WHERE id = %s
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(query, (notification_id,)).fetchone()

    def list_by_parcel(self, colis_id):
        query = """
            SELECT id, colis_id, livraison_id, email_destinataire, type,
                   message, statut_envoi, date_creation, date_envoi, evenement
            FROM notification.notifications
            WHERE colis_id = %s
            ORDER BY date_creation DESC
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(query, (colis_id,)).fetchall()

    def get_notification_by_event(self, colis_id, evenement):
        query = """
            SELECT id, colis_id, livraison_id, email_destinataire, type,
                   message, statut_envoi, date_creation, date_envoi, evenement
            FROM notification.notifications
            WHERE colis_id = %s AND evenement = %s
            ORDER BY date_creation DESC
            LIMIT 1
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query, (colis_id, evenement)
            ).fetchone()

    def get_delivery_notification(self, colis_id):
        return self.get_notification_by_event(colis_id, "LIVRE")


    def create_courier_notification(
        self, livreur_id, livraison_id, title, message,
        category="Affectation"
    ):
        query = """
            INSERT INTO notification.notifications_livreurs
                (livreur_id, livraison_id, category, title, message)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (livraison_id, livreur_id) DO NOTHING
            RETURNING id, livreur_id, livraison_id, category,
                      title, message, is_read, created_at
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query,
                (livreur_id, livraison_id, category, title, message),
            ).fetchone()

    def list_courier_notifications(self, livreur_id):
        query = """
            SELECT id, livreur_id, livraison_id, category,
                   title, message, is_read, created_at
            FROM notification.notifications_livreurs
            WHERE livreur_id = %s
            ORDER BY created_at DESC
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(query, (livreur_id,)).fetchall()

    def mark_courier_notification_read(self, notification_id, livreur_id):
        query = """
            UPDATE notification.notifications_livreurs
            SET is_read = TRUE
            WHERE id = %s AND livreur_id = %s
            RETURNING id, livreur_id, livraison_id, category,
                      title, message, is_read, created_at
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query, (notification_id, livreur_id)
            ).fetchone()


    
    def create_admin_notification(
        self, admin_id, agence_id, livraison_id, title, message,
        category="Système"
    ):
        query = """
            INSERT INTO notification.notifications_admins
                (admin_id, agence_id, livraison_id, category, title, message)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (livraison_id, agence_id) DO NOTHING
            RETURNING id, admin_id, agence_id, livraison_id,
                      category, title, message, is_read, created_at
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query,
                (admin_id, agence_id, livraison_id, category, title, message),
            ).fetchone()

    def list_admin_notifications(self, admin_id, agence_id):
        query = """
            SELECT id, admin_id, agence_id, livraison_id,
                   category, title, message, is_read, created_at
            FROM notification.notifications_admins
            WHERE admin_id = %s AND agence_id = %s
            ORDER BY created_at DESC
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query, (admin_id, agence_id)
            ).fetchall()

    def mark_admin_notification_read(self, notification_id, admin_id, agence_id):
        query = """
            UPDATE notification.notifications_admins
            SET is_read = TRUE
            WHERE id = %s AND admin_id = %s AND agence_id = %s
            RETURNING id, admin_id, agence_id, livraison_id,
                      category, title, message, is_read, created_at
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(
                query, (notification_id, admin_id, agence_id)
            ).fetchone()
