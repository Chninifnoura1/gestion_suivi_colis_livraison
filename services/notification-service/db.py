import logging
import time

import psycopg
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)


def connect(config):
    return psycopg.connect(
        dbname=config["POSTGRES_DB"],
        user=config["POSTGRES_USER"],
        password=config["POSTGRES_PASSWORD"],
        host=config["POSTGRES_HOST"],
        port=config["POSTGRES_PORT"],
        row_factory=dict_row,
    )


def wait_for_database(config):
    attempts = config["DB_CONNECT_RETRIES"]
    for attempt in range(1, attempts + 1):
        try:
            with connect(config):
                logger.info("Database connection established")
            return
        except psycopg.OperationalError:
            if attempt == attempts:
                logger.exception("Could not connect to database after %s attempts", attempts)
                raise
            logger.warning("Database unavailable (attempt %s/%s)", attempt, attempts)
            time.sleep(config["DB_RETRY_DELAY"])
