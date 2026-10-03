from sqlalchemy import Column, Integer, String, DECIMAL, Date
from app.database import Base


class WeatherData(Base):
    __tablename__ = "weather_data_table"

    weather_id = Column(Integer, primary_key=True, index=True)
    location = Column(String(45), nullable=True)
    temperature = Column(DECIMAL(10, 0), nullable=True)
    rainfall = Column(DECIMAL(10, 0), nullable=True)
    humidity = Column(DECIMAL(10, 0), nullable=True)
    recorded_date = Column(Date, nullable=True)