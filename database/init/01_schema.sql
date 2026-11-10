
-- ==========================================
-- GESTION ET SUIVI DES COLIS
-- Initial database schema
-- PostgreSQL
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. SCHEMAS
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS colis;
CREATE SCHEMA IF NOT EXISTS livraison;
CREATE SCHEMA IF NOT EXISTS statut;
CREATE SCHEMA IF NOT EXISTS notification;

-- ==========================================
-- 2. AUTH SERVICE
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
    role_id UUID NOT NULL REFERENCES auth.roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. COLIS SERVICE
-- ==========================================

CREATE TABLE colis.colis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_suivi VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    poids NUMERIC(10,2) NOT NULL CHECK (poids > 0),
    
    expediteur_nom VARCHAR(150) NOT NULL,
    expediteur_telephone VARCHAR(30) NOT NULL,
    expediteur_adresse TEXT NOT NULL,
    expediteur_ville VARCHAR(100) NOT NULL,

    destinataire_nom VARCHAR(150) NOT NULL,
    destinataire_telephone VARCHAR(30) NOT NULL,
    destinataire_email VARCHAR(255) NOT NULL,
    destinataire_adresse TEXT NOT NULL,
    destinataire_ville VARCHAR(100) NOT NULL,

    date_enregistrement TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================
-- 4. LIVRAISON SERVICE
-- ==========================================

CREATE TABLE livraison.livraisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livreur_id UUID NOT NULL,
    date_depart TIMESTAMPTZ,
    date_arrivee_prevue TIMESTAMPTZ,
    date_arrivee_reelle TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE livraison.livraison_colis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livraison_id UUID NOT NULL
        REFERENCES livraison.livraisons(id) ON DELETE CASCADE,
    colis_id UUID NOT NULL,
    date_tentative TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ordre_livraison INTEGER,
    UNIQUE (livraison_id, colis_id)
);

CREATE INDEX idx_livraison_colis_colis
ON livraison.livraison_colis(colis_id);

CREATE INDEX idx_livraisons_livreur
ON livraison.livraisons(livreur_id);

-- ==========================================
-- 5. STATUT SERVICE
-- ==========================================

CREATE TABLE statut.statuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    libelle VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE statut.historique_statuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colis_id UUID NOT NULL,
    statut_id UUID NOT NULL REFERENCES statut.statuts(id),
    utilisateur_id UUID,
    date_changement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    localisation TEXT,
    commentaire TEXT,
    motif_echec TEXT
);

CREATE INDEX idx_historique_colis_date
ON statut.historique_statuts(colis_id, date_changement DESC);

-- ==========================================
-- 6. NOTIFICATION SERVICE
-- ==========================================

CREATE TABLE notification.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colis_id UUID NOT NULL,
    email_destinataire VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    statut_envoi VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_envoi TIMESTAMPTZ
);

CREATE INDEX idx_notifications_colis
ON notification.notifications(colis_id);

-- ==========================================
-- 7. INITIAL DATA
-- ==========================================

INSERT INTO auth.roles (nom, description)
VALUES
    ('ADMIN', 'Administrateur du système'),
    ('LIVREUR', 'Livreur responsable des livraisons');

INSERT INTO statut.statuts (code, libelle, description)
VALUES
    ('CREE', 'Créé', 'Colis enregistré dans le système'),
    ('EN_ATTENTE', 'En attente de prise en charge', 'Colis en attente'),
    ('PRIS_EN_CHARGE', 'Pris en charge', 'Colis pris en charge par le livreur'),
    ('EN_COURS', 'En cours de livraison', 'Livraison en cours'),
    ('ECHEC', 'Échec de livraison', 'La livraison n''a pas abouti'),
    ('NOUVELLE_TENTATIVE', 'Nouvelle tentative planifiée', 'Une nouvelle livraison est prévue'),
    ('LIVRE', 'Livré', 'Colis livré au destinataire');
