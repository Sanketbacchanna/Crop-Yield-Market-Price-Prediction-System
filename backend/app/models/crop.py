from sqlalchemy import Column, Integer, String
from app.database import Base


class Crop(Base):
    __tablename__ = "crop_table"

    crop_id = Column(Integer, primary_key=True, index=True)
    crop_name = Column(String(100), nullable=True)
    crop_type = Column(String(100), nullable=True)
    season = Column(String(45), nullable=True)
    soil_type = Column(String(100), nullable=True)