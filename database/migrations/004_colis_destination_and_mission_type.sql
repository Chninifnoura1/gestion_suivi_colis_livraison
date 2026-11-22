
BEGIN;

-- 1. Ajouter les agences de destination et actuelle du colis
ALTER TABLE colis.colis
    ADD COLUMN IF NOT EXISTS agence_destination_id UUID,
    ADD COLUMN IF NOT EXISTS agence_actuelle_id UUID;

-- 2. Ajouter les clés étrangères si elles n'existent pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_colis_agence_destination'
          AND conrelid = 'colis.colis'::regclass
    ) THEN
        ALTER TABLE colis.colis
            ADD CONSTRAINT fk_colis_agence_destination
            FOREIGN KEY (agence_destination_id)
            REFERENCES agence.agences(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_colis_agence_actuelle'
          AND conrelid = 'colis.colis'::regclass
    ) THEN
        ALTER TABLE colis.colis
            ADD CONSTRAINT fk_colis_agence_actuelle
            FOREIGN KEY (agence_actuelle_id)
            REFERENCES agence.agences(id);
    END IF;
END $$;

-- 3. Déterminer l'agence de destination à partir de la ville du destinataire
UPDATE colis.colis c
SET agence_destination_id = a.id
FROM agence.agences a
WHERE LOWER(TRIM(c.destinataire_ville)) = LOWER(TRIM(a.ville));

-- 4. Par défaut, l'agence actuelle est l'agence d'expédition
UPDATE colis.colis
SET agence_actuelle_id = agence_expedition_id
WHERE agence_actuelle_id IS NULL;

-- 5. Corriger l'agence actuelle selon la dernière mission inter-agences terminée
WITH derniere_mission AS (
    SELECT DISTINCT ON (lc.colis_id)
        lc.colis_id,
        l.agence_arrivee_id
    FROM livraison.livraison_colis lc
    JOIN livraison.livraisons l ON l.id = lc.livraison_id
    WHERE l.etat_livraison IN ('ARRIVEE_A_L_AGENCE', 'LIVREE')
      AND l.agence_depart_id <> l.agence_arrivee_id
    ORDER BY lc.colis_id, l.created_at DESC
)
UPDATE colis.colis c
SET agence_actuelle_id = dm.agence_arrivee_id
FROM derniere_mission dm
WHERE c.id = dm.colis_id;

-- 6. L'agence actuelle doit toujours être renseignée
ALTER TABLE colis.colis
    ALTER COLUMN agence_actuelle_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_colis_agence_destination
    ON colis.colis(agence_destination_id);

CREATE INDEX IF NOT EXISTS idx_colis_agence_actuelle
    ON colis.colis(agence_actuelle_id);

-- 7. Ajouter le type de mission
ALTER TABLE livraison.livraisons
    ADD COLUMN IF NOT EXISTS type_mission VARCHAR(30)
    NOT NULL DEFAULT 'TRANSPORT_INTER_AGENCES';

-- 8. Vérifier les types de mission autorisés
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_type_mission'
          AND conrelid = 'livraison.livraisons'::regclass
    ) THEN
        ALTER TABLE livraison.livraisons
            ADD CONSTRAINT chk_type_mission
            CHECK (
                type_mission IN (
                    'TRANSPORT_INTER_AGENCES',
                    'LIVRAISON_CLIENT'
                )
            );
    END IF;
END $$;

-- 9. Adapter la règle des agences selon le type de mission
ALTER TABLE livraison.livraisons
    DROP CONSTRAINT IF EXISTS chk_agences_livraison_differentes;

ALTER TABLE livraison.livraisons
    ADD CONSTRAINT chk_agences_livraison_selon_type
    CHECK (
        (type_mission = 'TRANSPORT_INTER_AGENCES'
            AND agence_depart_id <> agence_arrivee_id)
        OR
        (type_mission = 'LIVRAISON_CLIENT'
            AND agence_depart_id = agence_arrivee_id)
    );

COMMIT;
