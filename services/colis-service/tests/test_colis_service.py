from decimal import Decimal

from app.database import SessionLocal
from app.schemas.colis import ColisCreate, ColisUpdate
from app.services import colis_service


def test_colis_crud():
    db = SessionLocal()
    created_colis = None

    try:
        # 1. CREATE
        data = ColisCreate(
            description="Colis de test CRUD",
            poids=Decimal("1.50"),
            expediteur_nom="Ahmed Test",
            expediteur_telephone="0600000011",
            expediteur_adresse="Hay Salam, Agadir",
            expediteur_ville="Agadir",
            destinataire_nom="Sara Test",
            destinataire_telephone="0600000012",
            destinataire_email="sara.test@example.com",
            destinataire_adresse="Gueliz, Marrakech",
            destinataire_ville="Marrakech",
        )

        created_colis = colis_service.create_colis(db, data)

        assert created_colis.id is not None
        assert created_colis.numero_suivi.startswith("SC-")

        print("CREATE : OK")
        print("Numero de suivi :", created_colis.numero_suivi)

        # 2. READ BY ID
        found = colis_service.get_colis_by_id(db, created_colis.id)
        assert found is not None
        print("READ BY ID : OK")

        # 3. READ BY TRACKING NUMBER
        found = colis_service.get_colis_by_tracking(
            db, created_colis.numero_suivi
        )
        assert found is not None
        print("READ BY TRACKING : OK")

        # 4. READ ALL
        all_colis = colis_service.get_all_colis(db)
        assert any(c.id == created_colis.id for c in all_colis)
        print("READ ALL : OK")

        # 5. UPDATE
        update_data = ColisUpdate(description="Description modifiee")

        updated = colis_service.update_colis(
            db, created_colis.id, update_data
        )

        assert updated.description == "Description modifiee"
        print("UPDATE : OK")

        # 6. DELETE
        deleted = colis_service.delete_colis(db, created_colis.id)
        assert deleted is True

        created_colis = None
        print("DELETE : OK")

        print("\nTous les tests CRUD sont reussis !")

    finally:
        # Clean up only the test parcel if an error occurs.
        if created_colis is not None:
            colis_service.delete_colis(db, created_colis.id)

        db.close()


if __name__ == "__main__":
    test_colis_crud()
