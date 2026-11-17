from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String, Text

from app.database import Base


class CropHistory(Base):
    __tablename__ = "crop_history"

    history_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("user_table.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    farm_id = Column(
        Integer,
        ForeignKey("farm_profiles.farm_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    crop_name = Column(String(100), nullable=False)
    season = Column(String(45), nullable=True)
    district = Column(String(45), nullable=True)
    planted_date = Column(Date, nullable=True)
    area_acres = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
