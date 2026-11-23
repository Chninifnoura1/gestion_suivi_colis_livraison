BEGIN;

-- Prevent duplicate arrival notifications for the same parcel
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_arrivee_agence_par_colis
ON notification.notifications (colis_id)
WHERE evenement = 'ARRIVEE_A_L_AGENCE';

COMMIT;
