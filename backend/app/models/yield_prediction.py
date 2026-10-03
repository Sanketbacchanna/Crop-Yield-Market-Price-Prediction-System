from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey
from app.database import Base


class YieldPrediction(Base):
    __tablename__ = "yield_prediction_table"

    prediction_id = Column(Integer, primary_key=True, index=True)

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

    agricultural_id = Column(
        Integer,
        ForeignKey("agricultural_data_table.agricultural_id"),
        nullable=True,
        index=True
    )

    predicted_yield = Column(DECIMAL(10, 0), nullable=True)
    model_used = Column(String(45), nullable=True)
    prediction_date = Column(DateTime, nullable=True)