\# Gestion et suivi des colis et livraisons



Projet de gestion et de suivi des colis basé sur une architecture microservices.



\## Technologies



\- Python 3.12

\- FastAPI

\- PostgreSQL 17

\- Docker et Docker Compose

\- Next.js / React

\- Git et GitHub



\## Architecture



Le projet comprend cinq microservices :



| Service | Responsabilité |

|---|---|

| auth-service | Authentification et gestion des utilisateurs |

| colis-service | Création et gestion des colis |

| livraison-service | Gestion des livraisons |

| statut-service | Gestion des statuts et historique |

| notification-service | Notifications par e-mail |



\## Prérequis



Installer :

\- Git

\- Python 3.12

\- Docker Desktop

\- Visual Studio Code



Démarrer Docker Desktop avant de lancer les commandes Docker.



\## Installation



\### 1. Cloner le dépôt



```powershell

git clone https://github.com/Chninifnoura1/gestion\_suivi\_colis\_livraison.git

cd gestion\_suivi\_colis\_livraison

```



\### 2. Récupérer sa branche



Chaque membre doit utiliser la branche de son service.



Exemple :



```powershell

git fetch origin

git switch --track origin/feature/auth-service

```



Remplacer `auth-service` par le service attribué.



\### 3. Configurer les variables d'environnement



Créer un fichier `.env` à partir de `.env.example`, puis renseigner ses propres mots de passe locaux.



\### 4. Démarrer PostgreSQL



```powershell

docker compose up -d postgres

```



Vérifier :



```powershell

docker compose ps

```



\### 5. Préparer l'environnement Python



Exemple pour Auth Service :



```powershell

cd services/auth-service

python -m venv .venv

.venv\\Scripts\\Activate.ps1

```



Installer les dépendances lorsqu'elles seront définies dans `requirements.txt`.



\## Organisation Git



\- `main` : version stable.

\- `dev` : intégration des microservices.

\- `feature/...` : développement individuel.



Chaque membre doit :

1\. Développer sur sa branche feature.

2\. Tester son service.

3\. Faire des commits réguliers.

4\. Pousser son code sur GitHub.

5\. Créer une Pull Request vers `dev`.



Ne jamais pousser directement sur `main` ou `dev`.



\## Docker



Chaque microservice possède son propre Dockerfile.



Le fichier Docker Compose global est géré par le responsable de l'architecture et de l'intégration.



La base PostgreSQL est exécutée dans un conteneur local partagé par les services de l'environnement de chaque développeur.



\## Sécurité



\- Ne jamais pousser le fichier `.env` sur GitHub.

\- Ne jamais partager les mots de passe personnels.

\- Utiliser uniquement des identifiants de développement local.

\- Ne pas modifier l'infrastructure globale sans coordination.

