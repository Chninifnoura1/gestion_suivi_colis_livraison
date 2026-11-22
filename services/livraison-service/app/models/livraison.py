
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ENUM

from app.database import Base


etat_livraison_enum = ENUM(
    "EN_ATTENTE",
    "EN_TRANSIT",
    "ARRIVEE_A_L_AGENCE",
    "LIVREE",
    name="etat_livraison",
    schema="livraison",
    create_type=False,
)


class Livraison(Base):
    __tablename__ = "livraisons"
    __table_args__ = {"schema": "livraison"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    livreur_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id"),
        nullable=False,
    )

    agence_depart_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agence.agences.id"),
        nullable=False,
    )

    agence_arrivee_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agence.agences.id"),
        nullable=False,
    )

    type_mission = Column(
        String(30),
        nullable=False,
        server_default="TRANSPORT_INTER_AGENCES",
    )

    ville_depart = Column(String(100), nullable=False)
    ville_arrivee = Column(String(100), nullable=False)

    date_depart = Column(DateTime(timezone=True), nullable=True)
    date_arrivee_prevue = Column(DateTime(timezone=True), nullable=True)
    date_arrivee_reelle = Column(DateTime(timezone=True), nullable=True)

    etat_livraison = Column(
        etat_livraison_enum,
        nullable=False,
        server_default="EN_ATTENTE",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
