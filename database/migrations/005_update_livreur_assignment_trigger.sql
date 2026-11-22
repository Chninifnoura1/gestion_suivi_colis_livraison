
BEGIN;

CREATE OR REPLACE FUNCTION livraison.check_livreur_agence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_role_name VARCHAR(30);
    v_ville_actuelle VARCHAR(100);
    v_ville_depart VARCHAR(100);
    v_is_active BOOLEAN;
    v_disponible BOOLEAN;
    v_peut_transport BOOLEAN;
    v_peut_livrer_client BOOLEAN;
BEGIN
    -- Récupérer les informations du livreur
    SELECT
        r.nom,
        u.ville_actuelle,
        u.is_active,
        u.disponible,
        u.peut_transport,
        u.peut_livrer_client
    INTO
        v_role_name,
        v_ville_actuelle,
        v_is_active,
        v_disponible,
        v_peut_transport,
        v_peut_livrer_client
    FROM auth.users u
    JOIN auth.roles r ON r.id = u.role_id
    WHERE u.id = NEW.livreur_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Livreur introuvable';
    END IF;

    IF v_role_name <> 'LIVREUR' THEN
        RAISE EXCEPTION
            'Seul un utilisateur avec le rôle LIVREUR peut être affecté';
    END IF;

    IF v_is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Ce livreur est désactivé';
    END IF;

    IF v_disponible IS NOT TRUE THEN
        RAISE EXCEPTION 'Ce livreur n est pas disponible';
    END IF;

    -- Récupérer la ville réelle de l'agence de départ
    SELECT ville
    INTO v_ville_depart
    FROM agence.agences
    WHERE id = NEW.agence_depart_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agence de départ introuvable ou inactive';
    END IF;

    -- Vérifier la ville actuelle du livreur
    IF LOWER(TRIM(COALESCE(v_ville_actuelle, '')))
       <> LOWER(TRIM(v_ville_depart)) THEN
        RAISE EXCEPTION
            'Le livreur doit être disponible dans la ville de départ';
    END IF;

    -- Vérifier la capacité selon le type de mission
    IF NEW.type_mission = 'TRANSPORT_INTER_AGENCES'
       AND v_peut_transport IS NOT TRUE THEN
        RAISE EXCEPTION
            'Ce livreur n est pas autorisé au transport inter-agences';
    END IF;

    IF NEW.type_mission = 'LIVRAISON_CLIENT'
       AND v_peut_livrer_client IS NOT TRUE THEN
        RAISE EXCEPTION
            'Ce livreur n est pas autorisé à livrer aux clients';
    END IF;

    -- Empêcher deux missions actives pour le même livreur
    IF EXISTS (
        SELECT 1
        FROM livraison.livraisons l
        WHERE l.livreur_id = NEW.livreur_id
          AND l.id <> NEW.id
          AND l.etat_livraison IN ('EN_ATTENTE', 'EN_TRANSIT')
    ) THEN
        RAISE EXCEPTION
            'Ce livreur possède déjà une mission en cours';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_livreur_agence
ON livraison.livraisons;

CREATE TRIGGER trg_check_livreur_agence
BEFORE INSERT OR UPDATE OF
    livreur_id,
    agence_depart_id,
    type_mission
ON livraison.livraisons
FOR EACH ROW
EXECUTE FUNCTION livraison.check_livreur_agence();

COMMIT;
