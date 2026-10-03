from sqlalchemy import Column, Integer, String, DECIMAL, Date, ForeignKey
from app.database import Base


class MarketPrice(Base):
    __tablename__ = "market_price_table"

    price_id = Column(Integer, primary_key=True, index=True)

    crop_id = Column(
        Integer,
        ForeignKey("crop_table.crop_id"),
        nullable=True,
        index=True
    )

    market_price = Column(DECIMAL(10, 0), nullable=True)
    price_date = Column(Date, nullable=True)
    market_location = Column(String(45), nullable=True)