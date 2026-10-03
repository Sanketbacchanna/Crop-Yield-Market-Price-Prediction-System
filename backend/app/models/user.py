from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base


class User(Base):
    __tablename__ = "user_table"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)
    email = Column(String(100), unique=True, nullable=True, index=True)
    password = Column(String(255), nullable=True)
    phone = Column(String(15), nullable=True)
    role = Column(String(30), nullable=True)
    created_at = Column(DateTime, nullable=True)