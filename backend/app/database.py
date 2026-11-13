import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            "Set it in the environment or backend/.env."
        )
    return value


DB_HOST = _required_env("DB_HOST")
DB_USER = _required_env("DB_USER")
DB_PASSWORD = _required_env("DB_PASSWORD")
DB_NAME = _required_env("DB_NAME")

try:
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
except ValueError as error:
    raise RuntimeError("DB_PORT must be an integer between 1 and 65535.") from error

if not 1 <= DB_PORT <= 65535:
    raise RuntimeError("DB_PORT must be an integer between 1 and 65535.")

DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()