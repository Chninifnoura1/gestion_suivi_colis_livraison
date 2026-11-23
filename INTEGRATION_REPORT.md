# ColisTrack integration report

The local `integration/all-services` branch contains the complete `origin/integration/test-all-services` snapshot at `5161d00`. Merge `0f62bfa` includes all five services, the React frontend, the PostgreSQL schema, the migrations, and the demo seed. The Auth route and schema conflicts were resolved by preserving the local `POST /auth/verify` additions. The Compose resolution uses the agreed host ports and healthy service dependencies. The frontend API URLs match the host mappings.

| Service | Host port | Container port |
|---|---:|---:|
| Auth | 8001 | 8000 |
| Livraison | 8002 | 8000 |
| Colis | 8003 | 8000 |
| Statut | 5003 | 5003 |
| Notification | 5005 | 5005 |
| PostgreSQL | 5432 | 5432 |
| pgAdmin | 5050 | 80 |

Compose passes shared PostgreSQL credentials and maps database host and port to the names each service reads. Auth, Colis, Livraison, and Statut receive the same `AUTH_SECRET_KEY`. Inter-service URLs use Compose service names and container ports.

## Smoke results

- All five images built. On the first clean start, PostgreSQL's demo import failed before the parcel was created. PostgreSQL later restarted with partial data.
- After repairing only the disposable fixture, all five health checks passed, three demo roles logged in and verified their tokens, a missing token returned HTTP 401, an authenticated courier read their delivery, and public tracking returned the demo parcel `SC-2026-DEMO-001`.
- The terminal workflow used an isolated fixture with a customer-delivery mission and an arrival status. The real Statut endpoint saved and read back `LIVRE`. Notification first returned HTTP 500. After adding the missing column in the disposable database, the same workflow created a mock notification with `statut_envoi=ENVOYEE` and read it back by ID.
- The frontend production build passed, its HTML and JavaScript served locally, and all four frontend-facing APIs accepted a CORS preflight from `http://localhost:5173`. The smoke test used internal service DNS to avoid conflicts with host ports. Browser interactions and external SMTP were outside this check.
- The imported suites reported 1 passed for Livraison, 17 passed for Notification, 4 passed and 1 failed for Colis, and 9 passed, 4 failed, and 12 setup errors for Statut.

## Findings for owners

| Owner | Finding and smallest proposed fix |
|---|---|
| Database | `02_demo_data.sql:158` fails with `null value in column "agence_actuelle_id" of relation "colis" violates not-null constraint`. Seed the current and intended destination agencies for the demo parcel and seed the assigned courier's current city and transport capability before inserting the demo mission. |
| Database and Statut | The clean schema defines the arrival code in the enum, but `statut.statuts` lacks the corresponding row. Include the reference data from migration 006 in the clean-install path. |
| Database and Notification | Notification logs `psycopg.errors.UndefinedColumn: column "evenement" does not exist`. Both the status webhook and notification reads failed. Add the column before deploying the Notification code and before applying migration 009, which already references it. |
| Statut | `LIVRE` saved successfully while the Notification webhook returned HTTP 500. Statut commits before notifying and currently sends notifications only for `LIVRE` and `ECHEC`. Confirm event scope with Notification and add a retry mechanism if delivery is required. Restore the missing `make_db` test helper and update the parcel fixture to include `agence_actuelle_id`. |
| Auth | The source branch lacked `POST /auth/verify`. The local route is in this integration and uses the existing bearer-token validation and active-user check. Other services still perform their own JWT verification. |
| Colis and Statut | The imported services lack service-local `.env.example` files. Add templates for the variables each service reads. The Colis CRUD test should also pass the required `agence_expedition_id` to `create_colis`. |

Temporary test SQL ran only against the isolated PostgreSQL database. The imported team SQL and other service code retain their source versions. A clean startup with working demo data and an unmodified status-to-notification pipeline are still blocked by the database findings above.

## Publish after approval

```bash
git push -u origin integration/all-services
gh pr create --base dev --head integration/all-services --title "Integrate ColisTrack services and frontend" --body-file INTEGRATION_REPORT.md
```
