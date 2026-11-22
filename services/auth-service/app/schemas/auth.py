
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str


class AgencyResponse(BaseModel):
    id: UUID
    nom_agence: str
    ville: str
    adresse: str | None
    telephone: str | None

    model_config = ConfigDict(from_attributes=True)

class AgencyCreate(BaseModel):
    nom_agence: str = Field(min_length=1, max_length=150)
    ville: str = Field(min_length=1, max_length=100)
    adresse: str | None = None
    telephone: str | None = Field(default=None, max_length=30)
    
class UserResponse(BaseModel):
    id: UUID
    nom: str
    prenom: str
    email: str
    role: str
    agence_id: UUID | None
    agence: AgencyResponse | None = None
    telephone: str | None
    matricule: str | None
    disponible: bool | None
    ville_actuelle: str | None = None
    peut_transport: bool | None = None
    peut_livrer_client: bool | None = None
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class AdminCreate(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8)
    telephone: str | None = None
    agence_id: UUID

class AdminUpdate(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    telephone: str | None = Field(default=None, max_length=30)
    password: str | None = Field(default=None, min_length=8)
    agence_id: UUID
class CourierCreate(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8)
    telephone: str | None = None
    disponible: bool = True
    is_active: bool = True
    peut_transport: bool = False
    peut_livrer_client: bool = True


class CourierUpdate(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    telephone: str | None = Field(default=None, max_length=30)
    disponible: bool
    is_active: bool
    peut_transport: bool = False
    peut_livrer_client: bool = True

class VilleActuelleUpdate(BaseModel):
    ville_actuelle: str = Field(min_length=1, max_length=100)
class DisponibiliteUpdate(BaseModel):
    disponible: bool

class ProfileUpdate(BaseModel):
    prenom: str = Field(min_length=1, max_length=100)
    nom: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    telephone: str | None = Field(default=None, max_length=30)
    matricule: str | None = Field(default=None, max_length=50)

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)