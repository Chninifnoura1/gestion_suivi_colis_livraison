from sqlalchemy import text

from app.database import engine


try:
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database(), current_schema()")
        )
        database, schema = result.fetchone()

        print("Connexion PostgreSQL réussie !")
        print(f"Database : {database}")
        print(f"Schema courant : {schema}")

        # Verify that the colis schema exists
        schema_result = connection.execute(
            text(
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name = 'colis'"
            )
        )

        if schema_result.fetchone():
            print("Schema colis : trouvé")
        else:
            print("Schema colis : introuvable")

except Exception as error:
    print("Erreur de connexion PostgreSQL :")
    print(error)
