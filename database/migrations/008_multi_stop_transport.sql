
-- Migration 008: Multi-stop inter-agency transport
-- Preserve all existing tables and records.

CREATE TABLE IF NOT EXISTS livraison.etapes_trajet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    livraison_id UUID NOT NULL
        REFERENCES livraison.livraisons(id) ON DELETE CASCADE,

    agence_id UUID NOT NULL
        REFERENCES agence.agences(id),

    ordre INTEGER NOT NULL CHECK (ordre >= 0),

    etat VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE'
        CHECK (etat IN (
            'EN_ATTENTE',
            'EN_COURS',
            'ARRIVEE',
            'CONFIRMEE'
        )),

    date_arrivee_reelle TIMESTAMPTZ,
    date_confirmation TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_etape_livraison_ordre
        UNIQUE (livraison_id, ordre),

    CONSTRAINT uq_etape_livraison_agence
        UNIQUE (livraison_id, agence_id)
);

CREATE INDEX IF NOT EXISTS idx_etapes_trajet_livraison_ordre
    ON livraison.etapes_trajet (livraison_id, ordre);

ALTER TABLE livraison.livraison_colis
    ADD COLUMN IF NOT EXISTS agence_chargement_id UUID
        REFERENCES agence.agences(id);

ALTER TABLE livraison.livraison_colis
    ADD COLUMN IF NOT EXISTS agence_dechargement_id UUID
        REFERENCES agence.agences(id);

CREATE INDEX IF NOT EXISTS idx_livraison_colis_dechargement
    ON livraison.livraison_colis (
        livraison_id,
        agence_dechargement_id
    );
