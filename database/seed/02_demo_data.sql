
-- ==========================================
-- DEMO DATA - GESTION ET SUIVI DES COLIS
-- Development environment only
-- Multi-Agences
-- ==========================================

-- ==========================================
-- 1. DEMO AGENCIES
-- ==========================================

INSERT INTO agence.agences (
    id, nom_agence, ville, adresse, telephone
)
VALUES
(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Agence Agadir',
    'Agadir',
    '10 Avenue Hassan II, Agadir',
    '0528000001'
),
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Agence Marrakech',
    'Marrakech',
    '25 Rue des FAR, Marrakech',
    '0524000002'
);

-- ==========================================
-- 2. DEMO USERS
-- ==========================================

-- SUPER ADMIN

INSERT INTO auth.users (
    id, nom, prenom, email, password_hash,
    role_id, agence_id
)
VALUES (
    '99999999-9999-4999-8999-999999999999',
    'Super',
    'Admin',
    'superadmin@suivicolis.local',
    crypt('SuperAdmin#2026', gen_salt('bf', 12)),
    (SELECT id FROM auth.roles WHERE nom = 'SUPER_ADMIN'),
    NULL
);

-- ADMIN AGENCE AGADIR

INSERT INTO auth.users (
    id, nom, prenom, email, password_hash,
    role_id, agence_id
)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Admin',
    'Agadir',
    'admin.agadir@suivicolis.local',
    crypt('AdminAgadir#2026', gen_salt('bf', 12)),
    (SELECT id FROM auth.roles WHERE nom = 'ADMIN'),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

-- LIVREUR AGENCE AGADIR

INSERT INTO auth.users (
    id, nom, prenom, email, password_hash,
    role_id, agence_id, telephone, matricule, disponible
)
VALUES (
    '22222222-2222-4222-8222-222222222222',
    'Livreur',
    'Agadir',
    'livreur.agadir@suivicolis.local',
    crypt('LivreurAgadir#2026', gen_salt('bf', 12)),
    (SELECT id FROM auth.roles WHERE nom = 'LIVREUR'),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '0600000003',
    'LIV-AGD-001',
    TRUE
);

-- ADMIN AGENCE MARRAKECH

INSERT INTO auth.users (
    id, nom, prenom, email, password_hash,
    role_id, agence_id
)
VALUES (
    '33333333-3333-4333-8333-333333333333',
    'Admin',
    'Marrakech',
    'admin.marrakech@suivicolis.local',
    crypt('AdminMarrakech#2026', gen_salt('bf', 12)),
    (SELECT id FROM auth.roles WHERE nom = 'ADMIN'),
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);

-- LIVREUR AGENCE MARRAKECH

INSERT INTO auth.users (
    id, nom, prenom, email, password_hash,
    role_id, agence_id, telephone, matricule, disponible
)
VALUES (
    '88888888-8888-4888-8888-888888888888',
    'Livreur',
    'Marrakech',
    'livreur.marrakech@suivicolis.local',
    crypt('LivreurMarrakech#2026', gen_salt('bf', 12)),
    (SELECT id FROM auth.roles WHERE nom = 'LIVREUR'),
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '0600000004',
    'LIV-MRK-001',
    TRUE
);

-- ==========================================
-- 3. DEMO PARCEL
-- ==========================================

INSERT INTO colis.colis (
    id,
    numero_suivi,
    description,
    poids,
    agence_expedition_id,
    expediteur_nom,
    expediteur_telephone,
    expediteur_adresse,
    expediteur_ville,
    destinataire_nom,
    destinataire_telephone,
    destinataire_email,
    destinataire_adresse,
    destinataire_ville,
    date_envoi_estimee
)
VALUES (
    '44444444-4444-4444-8444-444444444444',
    'SC-2026-DEMO-001',
    'Colis de démonstration',
    2.50,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Ahmed Benali',
    '0600000001',
    '10 Avenue Hassan II',
    'Agadir',
    'Sara Alaoui',
    '0600000002',
    'sara.demo@example.com',
    '25 Rue des FAR',
    'Marrakech',
    CURRENT_DATE + 2
);

-- ==========================================
-- 4. DEMO DELIVERY
-- ==========================================

INSERT INTO livraison.livraisons (
    id,
    livreur_id,
    agence_depart_id,
    agence_arrivee_id,
    ville_depart,
    ville_arrivee,
    date_depart,
    date_arrivee_prevue,
    etat_livraison
)
VALUES (
    '55555555-5555-4555-8555-555555555555',
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Agadir',
    'Marrakech',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '1 day',
    'EN_TRANSIT'
);

-- ==========================================
-- 5. PARCEL - DELIVERY RELATION
-- ==========================================

INSERT INTO livraison.livraison_colis (
    id, livraison_id, colis_id, ordre_livraison
)
VALUES (
    '66666666-6666-4666-8666-666666666666',
    '55555555-5555-4555-8555-555555555555',
    '44444444-4444-4444-8444-444444444444',
    1
);

-- ==========================================
-- 6. STATUS HISTORY
-- ==========================================

INSERT INTO statut.historique_statuts (
    id,
    colis_id,
    statut_id,
    utilisateur_id,
    date_changement,
    localisation,
    commentaire
)
VALUES
(
    '77777777-7777-4777-8777-777777777771',
    '44444444-4444-4444-8444-444444444444',
    (SELECT id FROM statut.statuts WHERE code = 'CREE'),
    '11111111-1111-4111-8111-111111111111',
    NOW() - INTERVAL '3 days',
    'Agadir',
    'Colis enregistré par administration'
),
(
    '77777777-7777-4777-8777-777777777772',
    '44444444-4444-4444-8444-444444444444',
    (SELECT id FROM statut.statuts WHERE code = 'PRIS_EN_CHARGE'),
    '22222222-2222-4222-8222-222222222222',
    NOW() - INTERVAL '2 days',
    'Agadir',
    'Colis pris en charge par le livreur'
),
(
    '77777777-7777-4777-8777-777777777773',
    '44444444-4444-4444-8444-444444444444',
    (SELECT id FROM statut.statuts WHERE code = 'EN_COURS'),
    '22222222-2222-4222-8222-222222222222',
    NOW() - INTERVAL '1 day',
    'Marrakech',
    'Colis en cours de livraison'
);

-- ==========================================
-- 7. DEMO NOTIFICATION
-- ==========================================

INSERT INTO notification.notifications (
    id,
    colis_id,
    livraison_id,
    email_destinataire,
    type,
    message,
    statut_envoi,
    date_envoi
)
VALUES (
    '88888888-8888-4888-8888-888888888887',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
    'sara.demo@example.com',
    'EMAIL',
    'Votre livraison est en cours.',
    'ENVOYEE',
    NOW()
);

-- ==========================================
-- END OF DEMO DATA
-- ==========================================
