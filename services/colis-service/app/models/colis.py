import uuid

from sqlalchemy import Column, DateTime, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Colis(Base):
    __tablename__ = "colis"
    __table_args__ = {"schema": "colis"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    numero_suivi = Column(
        String(50),
        nullable=False,
        unique=True,
    )

    description = Column(Text, nullable=True)

    poids = Column(
        Numeric(10, 2),
        nullable=False,
    )

    expediteur_nom = Column(String(150), nullable=False)
    expediteur_telephone = Column(String(30), nullable=False)
    expediteur_adresse = Column(Text, nullable=False)
    expediteur_ville = Column(String(100), nullable=False)

    destinataire_nom = Column(String(150), nullable=False)
    destinataire_telephone = Column(String(30), nullable=False)
    destinataire_email = Column(String(255), nullable=False)
    destinataire_adresse = Column(Text, nullable=False)
    destinataire_ville = Column(String(100), nullable=False)

    date_enregistrement = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
