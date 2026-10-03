from sqlalchemy import Column, Integer, String, DECIMAL, Date, ForeignKey
from app.database import Base


class PricePrediction(Base):
    __tablename__ = "price_prediction_table"

    price_prediction_id = Column(
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

    forecast_price = Column(DECIMAL(10, 0), nullable=True)
    model_used = Column(String(45), nullable=True)
    forecast_date = Column(Date, nullable=True)