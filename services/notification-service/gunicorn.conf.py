import os


bind = f"0.0.0.0:{os.getenv('PORT', '5005')}"


def on_starting(server):
    from app import app
    from db import wait_for_database

    wait_for_database(app.config)
