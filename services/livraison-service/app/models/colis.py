
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Colis(Base):
    __tablename__ = "colis"
    __table_args__ = {"schema": "colis"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
    )

    agence_destination_id = Column(
        UUID(as_uuid=True),
        nullable=True,
    )

    agence_actuelle_id = Column(
        UUID(as_uuid=True),
        nullable=False,
    )
