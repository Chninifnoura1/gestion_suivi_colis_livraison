BEGIN;

ALTER TABLE auth.users
    ADD COLUMN IF NOT EXISTS ville_actuelle VARCHAR(100),
    ADD COLUMN IF NOT EXISTS peut_transport BOOLEAN,
    ADD COLUMN IF NOT EXISTS peut_livrer_client BOOLEAN;

UPDATE auth.users AS u
SET
    ville_actuelle = COALESCE(
        NULLIF(TRIM(u.ville_actuelle), ''),
        TRIM(a.ville)
    ),
    peut_transport = COALESCE(u.peut_transport, FALSE),
    peut_livrer_client = COALESCE(u.peut_livrer_client, TRUE)
FROM auth.roles AS r, agence.agences AS a
WHERE u.role_id = r.id
  AND r.nom = 'LIVREUR'
  AND u.agence_id = a.id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM auth.users AS u
        JOIN auth.roles AS r ON r.id = u.role_id
        WHERE r.nom = 'LIVREUR'
          AND (
              u.ville_actuelle IS NULL
              OR u.peut_transport IS NULL
              OR u.peut_livrer_client IS NULL
          )
    ) THEN
        RAISE EXCEPTION
            'Migration annulée : un livreur possède des données incomplètes ou aucune agence valide.';
    END IF;
END $$;

COMMIT;
