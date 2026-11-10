# Notification Service

Microservice Flask qui enregistre les notifications dans `notification.notifications`, lit les informations destinataire depuis `colis.colis` et envoie les emails en mode simulé ou via SMTP. Il ne crée ni ne modifie aucun schéma.

Le port local proposé est `5005` (`PORT`). Confirmez ce port avec le responsable de l'intégration avant l'ajout du service à la configuration de l'équipe.

## Configuration locale (PowerShell)

Depuis `services/notification-service` :

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Renseignez les valeurs PostgreSQL dans `.env`. Le mode d'envoi par défaut `mock` consigne les emails dans le journal et les marque comme envoyés; le mode `real` utilise SMTP avec STARTTLS.

```powershell
$env:POSTGRES_DB = "suivi_colis"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "<mot-de-passe-local>"
$env:POSTGRES_HOST = "localhost"
$env:POSTGRES_PORT = "5432"
$env:PORT = "5005"
$env:NOTIFICATION_MODE = "mock"
python app.py
```

Le fichier `.env` est chargé automatiquement. Le démarrage local vérifie la connexion PostgreSQL avec plusieurs tentatives. Si `INTERNAL_API_KEY` est configurée, incluez `-H "X-Internal-Key: <valeur>"` à chaque requête POST.

## Docker

```powershell
docker build -t notification-service:local .
docker run --rm -p 5005:5005 `
  -e POSTGRES_DB="suivi_colis" `
  -e POSTGRES_USER="postgres" `
  -e POSTGRES_PASSWORD="<mot-de-passe-local>" `
  -e POSTGRES_HOST="host.docker.internal" `
  -e POSTGRES_PORT="5432" `
  -e PORT="5005" `
  -e NOTIFICATION_MODE="mock" `
  notification-service:local
```

Utilisez `POSTGRES_HOST=postgres` dans le réseau Docker Compose de l'équipe. Ne passez jamais de vrais secrets sur une ligne de commande partagée; utilisez les variables d'environnement sécurisées de votre déploiement.

### Extrait Compose à intégrer par le responsable (ne pas remplacer le compose global)

```yaml
  notification-service:
    build:
      context: ./services/notification-service
    ports:
      - "${NOTIFICATION_PORT:-5005}:5005"
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      PORT: 5005
      NOTIFICATION_MODE: ${NOTIFICATION_MODE:-mock}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      SMTP_FROM: ${SMTP_FROM:-}
      INTERNAL_API_KEY: ${INTERNAL_API_KEY:-}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - suivi_colis_network
```

## API

Tous les corps et toutes les réponses sont en JSON. Les chemins POST peuvent être protégés avec `INTERNAL_API_KEY`. Les notifications dont l'email échoue restent enregistrées avec `statut_envoi=ECHEC`; l'API renvoie la notification sauvegardée pour permettre un nouvel essai.

Exemple PowerShell avec les données de démonstration:

```powershell
curl.exe http://localhost:5005/health
curl.exe -X POST http://localhost:5005/notifications/statut `
  -H "Content-Type: application/json" `
  -d '{"colisId":"33333333-3333-4333-8333-333333333333","statutCode":"EN_COURS","localisation":"Marrakech"}'
curl.exe -X POST http://localhost:5005/notifications `
  -H "Content-Type: application/json" `
  -d '{"colisId":"33333333-3333-4333-8333-333333333333","message":"Bonjour Sara, votre colis SC-2026-DEMO-001 est en cours de livraison."}'
curl.exe -X POST http://localhost:5005/notifications/livraison/44444444-4444-4444-8444-444444444444/statut `
  -H "Content-Type: application/json" `
  -d '{"statutCode":"LIVRE","localisation":"Marrakech"}'
curl.exe http://localhost:5005/notifications/colis/33333333-3333-4333-8333-333333333333
curl.exe http://localhost:5005/notifications/77777777-7777-4777-8777-777777777777
curl.exe -X POST http://localhost:5005/notifications/77777777-7777-4777-8777-777777777777/renvoyer
```

La notification de démonstration `77777777-7777-4777-8777-777777777777` est déjà `ENVOYEE`; pour tester le renvoi, remplacez son identifiant par celui d'une notification dont `statut_envoi` vaut `ECHEC`.

Le code démo de colis est `33333333-3333-4333-8333-333333333333` (Sara Alaoui, `sara.demo@example.com`, suivi `SC-2026-DEMO-001`). Le code démo de livraison est `44444444-4444-4444-8444-444444444444`.

Importer `postman/notification-service.postman_collection.json` pour les exemples complets.

## Tests

Depuis `services/notification-service`, dans l'environnement virtuel:

```powershell
pytest
```
