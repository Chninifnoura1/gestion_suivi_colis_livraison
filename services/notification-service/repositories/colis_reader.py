class ColisReader:
    def __init__(self, connection_factory, config):
        self.connection_factory = connection_factory
        self.config = config

    def get_recipient(self, colis_id):
        query = """
            SELECT id, numero_suivi, destinataire_nom, destinataire_email
            FROM colis.colis
            WHERE id = %s
        """
        with self.connection_factory(self.config) as connection:
            return connection.execute(query, (colis_id,)).fetchone()

    def list_by_delivery(self, livraison_id):
        query = """
            SELECT colis_id
            FROM livraison.livraison_colis
            WHERE livraison_id = %s
            ORDER BY ordre_livraison NULLS LAST, colis_id
        """
        with self.connection_factory(self.config) as connection:
            rows = connection.execute(query, (livraison_id,)).fetchall()
            return [row["colis_id"] for row in rows]
