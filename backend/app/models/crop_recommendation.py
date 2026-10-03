from sqlalchemy import Column, Integer, DECIMAL, DateTime, ForeignKey
from app.database import Base


class CropRecommendation(Base):
    __tablename__ = "crop_recommendation_table"

    recommendation_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("user_table.user_id"),
        nullable=True,
        index=True
    )

    crop_id = Column(
        Integer,
        ForeignKey("crop_table.crop_id"),
        nullable=True,
        index=True
    )

    predicted_yield = Column(DECIMAL(10, 0), nullable=True)
    forecast_price = Column(DECIMAL(10, 0), nullable=True)
    recommendation_rank = Column(Integer, nullable=True)
    recommendation_date = Column(DateTime, nullable=True)