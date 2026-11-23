CREATE TABLE IF NOT EXISTS notification.notifications_livreurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    livreur_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    livraison_id UUID NOT NULL
        REFERENCES livraison.livraisons(id) ON DELETE CASCADE,

    category VARCHAR(50) NOT NULL DEFAULT 'Affectation',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_notification_livreur_mission
        UNIQUE (livraison_id, livreur_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_livreurs_livreur_date
    ON notification.notifications_livreurs (livreur_id, created_at DESC);
