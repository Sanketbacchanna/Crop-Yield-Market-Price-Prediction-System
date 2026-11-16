from sqlalchemy import Column, ForeignKey, Integer, Numeric, String

from app.database import Base


class FarmProfile(Base):
    __tablename__ = "farm_profiles"

    farm_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("user_table.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    farm_name = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False, default="Karnataka")
    district = Column(String(45), nullable=False)
    area_acres = Column(Numeric(10, 2), nullable=False)
    soil_type = Column(String(100), nullable=True)
    irrigation_type = Column(String(100), nullable=True)
    primary_crop = Column(String(100), nullable=True)
    season = Column(String(45), nullable=True)
