
from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EtatLivraison(str, Enum):
    EN_ATTENTE = "EN_ATTENTE"
    EN_TRANSIT = "EN_TRANSIT"
    ARRIVEE_A_L_AGENCE = "ARRIVEE_A_L_AGENCE"
    LIVREE = "LIVREE"


class TypeMission(str, Enum):
    TRANSPORT_INTER_AGENCES = "TRANSPORT_INTER_AGENCES"
    LIVRAISON_CLIENT = "LIVRAISON_CLIENT"


class LivraisonCreate(BaseModel):
    livreur_id: UUID
    agence_depart_id: UUID
    agence_arrivee_id: UUID

    type_mission: TypeMission = TypeMission.TRANSPORT_INTER_AGENCES

    ville_depart: str = Field(min_length=1, max_length=100)
    ville_arrivee: str = Field(min_length=1, max_length=100)

    date_depart: datetime | None = None
    date_arrivee_prevue: datetime | None = None


class LivraisonUpdate(BaseModel):
    livreur_id: UUID | None = None
    agence_depart_id: UUID | None = None
    agence_arrivee_id: UUID | None = None
    type_mission: TypeMission | None = None

    ville_depart: str | None = Field(default=None, min_length=1, max_length=100)
    ville_arrivee: str | None = Field(default=None, min_length=1, max_length=100)

    date_depart: datetime | None = None
    date_arrivee_prevue: datetime | None = None
    date_arrivee_reelle: datetime | None = None

    etat_livraison: EtatLivraison | None = None


class LivraisonLivreurUpdate(BaseModel):
    etat_livraison: EtatLivraison | None = None
    date_arrivee_reelle: datetime | None = None


class LivraisonResponse(BaseModel):
    id: UUID
    livreur_id: UUID
    agence_depart_id: UUID
    agence_arrivee_id: UUID

    type_mission: TypeMission

    ville_depart: str
    ville_arrivee: str

    date_depart: datetime | None
    date_arrivee_prevue: datetime | None
    date_arrivee_reelle: datetime | None

    etat_livraison: EtatLivraison
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LivraisonAffectationCreate(BaseModel):
    livreur_id: UUID
    colis_ids: list[UUID] = Field(min_length=1)

class LivraisonMultiEtapesCreate(BaseModel):
    livreur_id: UUID

    # Agences traversees, dans l'ordre du trajet
    agence_ids: list[UUID] = Field(min_length=2)

    # Colis disponibles dans l'agence de depart
    colis_ids: list[UUID] = Field(min_length=1)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "livreur_id": "00000000-0000-0000-0000-000000000001",
                "agence_ids": [
                    "00000000-0000-0000-0000-000000000002",
                    "00000000-0000-0000-0000-000000000003",
                    "00000000-0000-0000-0000-000000000004"
                ],
                "colis_ids": [
                    "00000000-0000-0000-0000-000000000005"
                ]
            }
        }
    )


class LivraisonMultiEtapesCreate(BaseModel):
    livreur_id: UUID

    # Agences traversees, dans l'ordre du trajet
    agence_ids: list[UUID] = Field(min_length=1)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "livreur_id": "00000000-0000-0000-0000-000000000001",
                "agence_ids": [
                    "00000000-0000-0000-0000-000000000002",
                    "00000000-0000-0000-0000-000000000003",
                    "00000000-0000-0000-0000-000000000004"
                ]
            }
        }
    )

class AjouterColisEtapeCreate(BaseModel):
    colis_ids: list[UUID] = Field(min_length=1)
