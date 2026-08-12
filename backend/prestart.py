import sys
import os
import subprocess

# Add the parent directory to sys.path so we can import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, inspect
from app.core.config import settings
from app.core.database import Base
# Import all models to ensure they are registered with Base.metadata
from app.models import *

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    if not inspector.has_table("alembic_version"):
        logger.info("Fresh database detected. Initializing tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Stamping alembic head...")
        subprocess.run(["alembic", "stamp", "head"], check=True)
    else:
        logger.info("Existing database detected. Running migrations...")
        subprocess.run(["alembic", "upgrade", "head"], check=True)

if __name__ == "__main__":
    main()
