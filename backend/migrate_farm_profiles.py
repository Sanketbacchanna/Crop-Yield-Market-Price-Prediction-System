from app.database import engine
from app.models.farm_profile import FarmProfile


def migrate_farm_profiles() -> None:
    FarmProfile.__table__.create(bind=engine, checkfirst=True)
    print("Farm profile table is ready.")


if __name__ == "__main__":
    migrate_farm_profiles()
