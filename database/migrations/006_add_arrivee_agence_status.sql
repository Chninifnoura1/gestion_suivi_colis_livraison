INSERT INTO statut.statuts (code, libelle, description)
VALUES (
    'ARRIVEE_A_L_AGENCE',
    'Arrivee a l''agence',
    'Colis arrive a l''agence de destination, en attente de confirmation de reception par un administrateur'
)
ON CONFLICT (code) DO NOTHING;