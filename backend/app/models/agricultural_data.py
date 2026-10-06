from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey
from app.database import Base


class AgriculturalData(Base):
    __tablename__ = "agricultural_data_table"

    agricultural_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    state = Column(
        String(105),
        nullable=True
    )

    district = Column(
        String(45),
        nullable=True
    )

    season = Column(
        String(45),
        nullable=True
    )

    crop_id = Column(
        Integer,
        ForeignKey("crop_table.crop_id"),
        nullable=True,
        index=True
    )

    cultivated_area = Column(
        DECIMAL(10, 0),
        nullable=True
    )

    soil_type = Column(
        String(100),
        nullable=True
    )

    crop_year = Column(
        String(20),
        nullable=True
    )