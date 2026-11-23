from decimal import Decimal

from pydantic import ValidationError

from app.schemas.colis import ColisCreate, ColisUpdate


def test_colis_create():
    data = {
        "description": "Colis de test",
        "poids": "2.50",
        "expediteur_nom": "Ahmed Benali",
        "expediteur_telephone": "0600000001",
        "expediteur_adresse": "Hay Salam, Rue 10",
        "expediteur_ville": "Agadir",
        "destinataire_nom": "Sara Alaoui",
        "destinataire_telephone": "0600000002",
        "destinataire_email": "sara@example.com",
        "destinataire_adresse": "Gueliz, Avenue Mohammed V",
        "destinataire_ville": "Marrakech",
    }

    colis = ColisCreate(**data)

    assert colis.poids == Decimal("2.50")
    assert colis.destinataire_email == "sara@example.com"

    print("CREATE schema : OK")


def test_colis_update():
    colis = ColisUpdate(description="Nouvelle description")

    assert colis.description == "Nouvelle description"
    assert colis.poids is None

    print("UPDATE schema : OK")


def test_invalid_email():
    try:
        ColisCreate(
            description="Test",
            poids="2.50",
            expediteur_nom="Ahmed",
            expediteur_telephone="0600000001",
            expediteur_adresse="Agadir",
            expediteur_ville="Agadir",
            destinataire_nom="Sara",
            destinataire_telephone="0600000002",
            destinataire_email="email-invalide",
            destinataire_adresse="Marrakech",
            destinataire_ville="Marrakech",
        )
    except ValidationError:
        print("Invalid email rejected : OK")
    else:
        raise AssertionError("Invalid email was accepted")


if __name__ == "__main__":
    test_colis_create()
    test_colis_update()
    test_invalid_email()
