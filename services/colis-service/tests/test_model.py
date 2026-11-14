from sqlalchemy import inspect

from app.database import engine
from app.models.colis import Colis


def test_colis_model():
    inspector = inspect(engine)

    assert inspector.has_table("colis", schema="colis")

    columns = inspector.get_columns("colis", schema="colis")
    column_names = [column["name"] for column in columns]

    assert "id" in column_names
    assert "numero_suivi" in column_names
    assert "expediteur_nom" in column_names
    assert "destinataire_nom" in column_names

    print("Table colis.colis reconnue !")
    print("Nombre de colonnes :", len(column_names))
    print("Colonnes :", column_names)


if __name__ == "__main__":
    test_colis_model()
