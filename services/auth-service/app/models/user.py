
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True)
    nom = Column(String(30), nullable=False, unique=True)
    description = Column(Text, nullable=True)


class Agence(Base):
    __tablename__ = "agences"
    __table_args__ = {"schema": "agence"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    nom_agence = Column(String(150), nullable=False)
    ville = Column(String(100), nullable=False)
    adresse = Column(Text, nullable=True)
    telephone = Column(String(30), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)

    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)

    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.roles.id"),
        nullable=False,
    )

    agence_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agence.agences.id"),
        nullable=True,
    )

    agence = relationship(
        "Agence",
        foreign_keys=[agence_id],
    )

    telephone = Column(String(30), nullable=True)
    matricule = Column(String(50), nullable=True)
    disponible = Column(Boolean, nullable=True)
    ville_actuelle = Column(String(100), nullable=True)
    peut_transport = Column(Boolean, nullable=False, default=False)
    peut_livrer_client = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )
