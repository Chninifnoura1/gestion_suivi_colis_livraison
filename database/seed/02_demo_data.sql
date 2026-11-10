
-- ==========================================
-- DEMO DATA - GESTION ET SUIVI DES COLIS
-- Development environment only
-- ==========================================

-- 1. DEMO USERS
-- Passwords are hashed with bcrypt using pgcrypto.
-- Demo credentials must never be used in production.

INSERT INTO auth.users (
    id, nom, prenom, email, password_hash, role_id
)
VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'Admin',
    'Demo',
    'admin.demo@suivicolis.local',
    crypt('DemoAdmin#2026', gen_salt('bf', 12)),
    (SELECT id FROM auth.roles WHERE nom = 'ADMIN')
),
(
    '22222222-2222-4222-8222-222222222222',
    'Livreur',
    'Demo',
    'livreur.demo@suivicolis.local',
    crypt('DemoLivreur#2026', gen_salt('bf', 12)),
    (SELECT id FROM auth.roles WHERE nom = 'LIVREUR')
)
ON CONFLICT (email) DO NOTHING;


-- 2. DEMO PARCEL
INSERT INTO colis.colis (
    id,
    numero_suivi,
    description,
    poids,
    expediteur_nom,
    expediteur_telephone,
    expediteur_adresse,
    expediteur_ville,
    destinataire_nom,
    destinataire_telephone,
    destinataire_email,
    destinataire_adresse,
    destinataire_ville
)
VALUES (
    '33333333-3333-4333-8333-333333333333',
    'SC-2026-DEMO-001',
    'Colis de démonstration',
    2.50,
    'Ahmed Benali',
    '0600000001',
    '10 Avenue Hassan II',
    'Agadir',
    'Sara Alaoui',
    '0600000002',
    'sara.demo@example.com',
    '25 Rue des FAR',
    'Marrakech'
)
ON CONFLICT (numero_suivi) DO NOTHING;


-- 3. DEMO DELIVERY
INSERT INTO livraison.livraisons (
    id,
    livreur_id,
    date_depart,
    date_arrivee_prevue
)
VALUES (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;


-- 4. PARCEL - DELIVERY RELATION
INSERT INTO livraison.livraison_colis (
    id,
    livraison_id,
    colis_id,
    ordre_livraison
)
VALUES (
    '55555555-5555-4555-8555-555555555555',
    '44444444-4444-4444-8444-444444444444',
    '33333333-3333-4333-8333-333333333333',
    1
)
ON CONFLICT (livraison_id, colis_id) DO NOTHING;


-- 5. STATUS HISTORY
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
    '66666666-6666-4666-8666-666666666661',
    '33333333-3333-4333-8333-333333333333',
    (SELECT id FROM statut.statuts WHERE code = 'CREE'),
    '11111111-1111-4111-8111-111111111111',
    NOW() - INTERVAL '3 days',
    'Agadir',
    'Colis enregistré par administration'
),
(
    '66666666-6666-4666-8666-666666666662',
    '33333333-3333-4333-8333-333333333333',
    (SELECT id FROM statut.statuts WHERE code = 'PRIS_EN_CHARGE'),
    '22222222-2222-4222-8222-222222222222',
    NOW() - INTERVAL '2 days',
    'Agadir',
    'Colis pris en charge par le livreur'
),
(
    '66666666-6666-4666-8666-666666666663',
    '33333333-3333-4333-8333-333333333333',
    (SELECT id FROM statut.statuts WHERE code = 'EN_COURS'),
    '22222222-2222-4222-8222-222222222222',
    NOW() - INTERVAL '1 day',
    'Marrakech',
    'Colis en cours de livraison'
)
ON CONFLICT (id) DO NOTHING;


-- 6. DEMO NOTIFICATION
INSERT INTO notification.notifications (
    id,
    colis_id,
    email_destinataire,
    type,
    message,
    statut_envoi,
    date_envoi
)
VALUES (
    '77777777-7777-4777-8777-777777777777',
    '33333333-3333-4333-8333-333333333333',
    'sara.demo@example.com',
    'EMAIL',
    'Votre colis SC-2026-DEMO-001 est en cours de livraison.',
    'ENVOYEE',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- END OF DEMO DATA
-- ==========================================
