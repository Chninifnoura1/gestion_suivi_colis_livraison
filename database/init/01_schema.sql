
-- ==========================================
-- GESTION ET SUIVI DES COLIS
-- Initial database schema
-- PostgreSQL 17
-- Multi-Agences Architecture
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. SCHEMAS
-- ==========================================

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS agence;
CREATE SCHEMA IF NOT EXISTS colis;
CREATE SCHEMA IF NOT EXISTS livraison;
CREATE SCHEMA IF NOT EXISTS statut;
CREATE SCHEMA IF NOT EXISTS notification;

-- ==========================================
-- 2. AGENCE SERVICE
-- ==========================================

CREATE TABLE agence.agences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nom_agence VARCHAR(150) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    adresse TEXT,
    telephone VARCHAR(30),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_agence_nom_ville
        UNIQUE (nom_agence, ville)
);

CREATE INDEX idx_agences_ville
ON agence.agences(ville);

-- ==========================================
-- 3. AUTH SERVICE
-- ==========================================

CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(30) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    role_id UUID NOT NULL
        REFERENCES auth.roles(id),

    agence_id UUID
        REFERENCES agence.agences(id),

    telephone VARCHAR(30),
    matricule VARCHAR(50),
    disponible BOOLEAN,
    ville_actuelle VARCHAR(100),
    peut_transport BOOLEAN NOT NULL DEFAULT FALSE,
    peut_livrer_client BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_matricule
ON auth.users(matricule)
WHERE matricule IS NOT NULL;

CREATE INDEX idx_users_agence
ON auth.users(agence_id);

-- Un seul Admin par agence et un seul Super Admin global.
-- Les règles liées aux rôles sont contrôlées par un trigger.


CREATE OR REPLACE FUNCTION auth.check_user_role_constraints()
RETURNS TRIGGER AS $$
DECLARE
    v_role_name VARCHAR(30);
BEGIN
    SELECT nom
    INTO v_role_name
    FROM auth.roles
    WHERE id = NEW.role_id;

    IF v_role_name IS NULL THEN
        RAISE EXCEPTION 'Role inexistant';
    END IF;

    IF v_role_name IN ('ADMIN', 'LIVREUR')
       AND NEW.agence_id IS NULL THEN
        RAISE EXCEPTION
            'Un ADMIN ou LIVREUR doit appartenir à une agence';
    END IF;

    IF v_role_name = 'SUPER_ADMIN'
       AND NEW.agence_id IS NOT NULL THEN
        RAISE EXCEPTION
            'Le SUPER_ADMIN ne doit appartenir à aucune agence';
    END IF;

    -- Verrouillage pour éviter les doublons simultanés
    IF v_role_name = 'ADMIN' THEN
        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                'ADMIN:' || NEW.agence_id::TEXT,
                0
            )
        );

        IF EXISTS (
            SELECT 1
            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
            WHERE r.nom = 'ADMIN'
              AND u.agence_id = NEW.agence_id
              AND u.id <> NEW.id
        ) THEN
            RAISE EXCEPTION
                'Cette agence possède déjà un ADMIN';
        END IF;
    END IF;

    IF v_role_name = 'SUPER_ADMIN' THEN
        PERFORM pg_advisory_xact_lock(
            hashtextextended('SUPER_ADMIN:GLOBAL', 0)
        );

        IF EXISTS (
            SELECT 1
            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
            WHERE r.nom = 'SUPER_ADMIN'
              AND u.id <> NEW.id
        ) THEN
            RAISE EXCEPTION
                'Un seul SUPER_ADMIN est autorisé';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_check_user_role_constraints
BEFORE INSERT OR UPDATE OF role_id, agence_id
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.check_user_role_constraints();

-- ==========================================
-- 4. COLIS SERVICE
-- ==========================================

CREATE TABLE colis.colis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    numero_suivi VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    poids NUMERIC(10,2) NOT NULL
        CHECK (poids > 0),

    -- Agence responsable de l'enregistrement du colis
    agence_expedition_id UUID NOT NULL
        REFERENCES agence.agences(id),

    -- Agence de destination et agence où se trouve actuellement le colis
    agence_destination_id UUID
        REFERENCES agence.agences(id),

    agence_actuelle_id UUID NOT NULL
        REFERENCES agence.agences(id),

    expediteur_nom VARCHAR(150) NOT NULL,
    expediteur_telephone VARCHAR(30) NOT NULL,
    expediteur_adresse TEXT NOT NULL,
    expediteur_ville VARCHAR(100) NOT NULL,

    destinataire_nom VARCHAR(150) NOT NULL,
    destinataire_telephone VARCHAR(30) NOT NULL,
    destinataire_email VARCHAR(255),
    destinataire_adresse TEXT NOT NULL,
    destinataire_ville VARCHAR(100) NOT NULL,

    date_envoi_estimee DATE,
    date_enregistrement TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_colis_agence_expedition
ON colis.colis(agence_expedition_id);
CREATE INDEX idx_colis_agence_destination
ON colis.colis(agence_destination_id);

CREATE INDEX idx_colis_agence_actuelle
ON colis.colis(agence_actuelle_id);
-- ==========================================
-- 5. LIVRAISON SERVICE
-- ==========================================

CREATE TYPE livraison.etat_livraison AS ENUM (
    'EN_ATTENTE',
    'EN_TRANSIT',
    'ARRIVEE_A_L_AGENCE',
    'LIVREE'
);

CREATE TABLE livraison.livraisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    livreur_id UUID NOT NULL
        REFERENCES auth.users(id),

    agence_depart_id UUID NOT NULL
        REFERENCES agence.agences(id),

    agence_arrivee_id UUID NOT NULL
        REFERENCES agence.agences(id),

    ville_depart VARCHAR(100) NOT NULL,
    ville_arrivee VARCHAR(100) NOT NULL,

    date_depart TIMESTAMPTZ,
    date_arrivee_prevue TIMESTAMPTZ,
    date_arrivee_reelle TIMESTAMPTZ,

    etat_livraison livraison.etat_livraison
        NOT NULL DEFAULT 'EN_ATTENTE',
    type_mission VARCHAR(30) NOT NULL DEFAULT 'TRANSPORT_INTER_AGENCES'
        CHECK (
            type_mission IN (
                'TRANSPORT_INTER_AGENCES',
                'LIVRAISON_CLIENT'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_agences_livraison_selon_type
        CHECK (
            (type_mission = 'TRANSPORT_INTER_AGENCES'
                AND agence_depart_id <> agence_arrivee_id)
            OR
            (type_mission = 'LIVRAISON_CLIENT'
                AND agence_depart_id = agence_arrivee_id)
        )
);


CREATE OR REPLACE FUNCTION livraison.check_livreur_agence()
RETURNS TRIGGER AS $$
DECLARE
    v_role_name VARCHAR(30);
    v_ville_actuelle VARCHAR(100);
    v_ville_depart VARCHAR(100);
    v_is_active BOOLEAN;
    v_disponible BOOLEAN;
    v_peut_transport BOOLEAN;
    v_peut_livrer_client BOOLEAN;
BEGIN
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
        RAISE EXCEPTION 'Seul un utilisateur LIVREUR peut être affecté';
    END IF;

    IF v_is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Ce livreur est désactivé';
    END IF;

    IF v_disponible IS NOT TRUE THEN
        RAISE EXCEPTION 'Ce livreur n est pas disponible';
    END IF;

    SELECT ville
    INTO v_ville_depart
    FROM agence.agences
    WHERE id = NEW.agence_depart_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agence de départ introuvable ou inactive';
    END IF;

    IF LOWER(TRIM(COALESCE(v_ville_actuelle, '')))
       <> LOWER(TRIM(v_ville_depart)) THEN
        RAISE EXCEPTION
            'Le livreur doit être disponible dans la ville de départ';
    END IF;

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_livreur_agence
BEFORE INSERT OR UPDATE OF livreur_id, agence_depart_id, type_mission
ON livraison.livraisons
FOR EACH ROW
EXECUTE FUNCTION livraison.check_livreur_agence();


CREATE INDEX idx_livraisons_livreur
ON livraison.livraisons(livreur_id);

CREATE INDEX idx_livraisons_agence_depart
ON livraison.livraisons(agence_depart_id);

CREATE INDEX idx_livraisons_agence_arrivee
ON livraison.livraisons(agence_arrivee_id);

CREATE TABLE livraison.livraison_colis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    livraison_id UUID NOT NULL
        REFERENCES livraison.livraisons(id)
        ON DELETE CASCADE,

    colis_id UUID NOT NULL
        REFERENCES colis.colis(id),

    date_tentative TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ordre_livraison INTEGER,

    UNIQUE (livraison_id, colis_id)
);

CREATE INDEX idx_livraison_colis_colis
ON livraison.livraison_colis(colis_id);

-- ==========================================
-- 6. STATUT SERVICE
-- ==========================================

CREATE TABLE statut.statuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) NOT NULL UNIQUE,
    libelle VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE statut.historique_statuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    colis_id UUID NOT NULL
        REFERENCES colis.colis(id),

    statut_id UUID NOT NULL
        REFERENCES statut.statuts(id),

    utilisateur_id UUID
        REFERENCES auth.users(id),

    date_changement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    localisation TEXT,
    commentaire TEXT,
    motif_echec TEXT
);

CREATE OR REPLACE FUNCTION statut.check_historique_user()
RETURNS TRIGGER AS $$
DECLARE
    v_active BOOLEAN;
BEGIN
    IF NEW.utilisateur_id IS NOT NULL THEN
        SELECT is_active
        INTO v_active
        FROM auth.users
        WHERE id = NEW.utilisateur_id;

        IF NOT FOUND OR v_active IS NOT TRUE THEN
            RAISE EXCEPTION
                'Utilisateur introuvable ou désactivé';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_historique_user
BEFORE INSERT OR UPDATE OF utilisateur_id
ON statut.historique_statuts
FOR EACH ROW
EXECUTE FUNCTION statut.check_historique_user();

CREATE INDEX idx_historique_colis_date
ON statut.historique_statuts(
    colis_id,
    date_changement DESC
);

-- ==========================================
-- 7. NOTIFICATION SERVICE
-- ==========================================

CREATE TABLE notification.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    colis_id UUID NOT NULL
        REFERENCES colis.colis(id),

    livraison_id UUID
        REFERENCES livraison.livraisons(id),

    email_destinataire VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,

    statut_envoi VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',

    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_envoi TIMESTAMPTZ
);

CREATE INDEX idx_notifications_colis
ON notification.notifications(colis_id);

CREATE INDEX idx_notifications_livraison
ON notification.notifications(livraison_id);
-- ==========================================
-- 8. INITIAL ROLES
-- ==========================================

INSERT INTO auth.roles (nom, description)
VALUES
    ('SUPER_ADMIN', 'Administrateur principal du système'),
    ('ADMIN', 'Administrateur responsable d une agence'),
    ('LIVREUR', 'Livreur responsable des livraisons');

-- ==========================================
-- 9. INITIAL STATUSES
-- ==========================================

INSERT INTO statut.statuts (code, libelle, description)
VALUES
    ('CREE', 'Créé', 'Colis enregistré dans le système'),
    ('EN_ATTENTE', 'En attente de prise en charge', 'Colis en attente'),
    ('PRIS_EN_CHARGE', 'Pris en charge', 'Colis pris en charge par le livreur'),
    ('EN_COURS', 'En cours de livraison', 'Livraison en cours'),
    ('ECHEC', 'Échec de livraison', 'La livraison n a pas abouti'),
    ('NOUVELLE_TENTATIVE', 'Nouvelle tentative planifiée', 'Une nouvelle livraison est prévue'),
    ('LIVRE', 'Livré', 'Colis livré au destinataire');

-- ==========================================
-- END INITIAL SCHEMA
-- ==========================================
