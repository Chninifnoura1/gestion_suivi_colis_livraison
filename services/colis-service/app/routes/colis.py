from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.colis import ColisCreate, ColisUpdate, ColisResponse
from app.services import colis_service


router = APIRouter(
    prefix="/api/colis",
    tags=["Colis"],
)


# CREATE
@router.post(
    "/",
    response_model=ColisResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_colis(
    colis_data: ColisCreate,
    db: Session = Depends(get_db),
):
    return colis_service.create_colis(db, colis_data)


# READ ALL
@router.get(
    "/",
    response_model=list[ColisResponse],
)
def get_all_colis(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return colis_service.get_all_colis(db, skip, limit)


# READ BY ID
@router.get(
    "/{colis_id}",
    response_model=ColisResponse,
)
def get_colis_by_id(
    colis_id: UUID,
    db: Session = Depends(get_db),
):
    colis = colis_service.get_colis_by_id(db, colis_id)

    if colis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colis introuvable",
        )

    return colis


# UPDATE
@router.patch(
    "/{colis_id}",
    response_model=ColisResponse,
)
def update_colis(
    colis_id: UUID,
    colis_data: ColisUpdate,
    db: Session = Depends(get_db),
):
    colis = colis_service.update_colis(db, colis_id, colis_data)

    if colis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colis introuvable",
        )

    return colis


# DELETE
@router.delete(
    "/{colis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_colis(
    colis_id: UUID,
    db: Session = Depends(get_db),
):
    deleted = colis_service.delete_colis(db, colis_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colis introuvable",
        )
