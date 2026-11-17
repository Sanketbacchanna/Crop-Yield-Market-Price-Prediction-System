from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.crop_history import CropHistory
from app.models.farm_profile import FarmProfile
from app.models.user import User

router = APIRouter(prefix="/crop-history", tags=["Crop History"])


class CropHistoryCreate(BaseModel):
    crop_name: str = Field(..., min_length=1, max_length=100)
    farm_id: Optional[int] = Field(default=None, gt=0)
    season: Optional[str] = Field(default=None, max_length=45)
    district: Optional[str] = Field(default=None, max_length=45)
    planted_date: Optional[date] = None
    area_acres: Optional[float] = Field(default=None, gt=0)
    notes: Optional[str] = Field(default=None, max_length=2000)


class CropHistoryUpdate(BaseModel):
    crop_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    farm_id: Optional[int] = Field(default=None, gt=0)
    season: Optional[str] = Field(default=None, max_length=45)
    district: Optional[str] = Field(default=None, max_length=45)
    planted_date: Optional[date] = None
    area_acres: Optional[float] = Field(default=None, gt=0)
    notes: Optional[str] = Field(default=None, max_length=2000)


def _serialize(history: CropHistory) -> dict:
    return {
        "history_id": history.history_id,
        "farm_id": history.farm_id,
        "crop_name": history.crop_name,
        "season": history.season,
        "district": history.district,
        "planted_date": history.planted_date.isoformat() if history.planted_date else None,
        "area_acres": float(history.area_acres) if history.area_acres is not None else None,
        "notes": history.notes,
    }


def _owned_farm(db: Session, farm_id: Optional[int], user_id: int) -> None:
    if farm_id is None:
        return
    farm = (
        db.query(FarmProfile)
        .filter(
            FarmProfile.farm_id == farm_id,
            FarmProfile.user_id == user_id,
        )
        .first()
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm profile not found.")


def _owned_history(db: Session, history_id: int, user_id: int) -> CropHistory:
    history = (
        db.query(CropHistory)
        .filter(
            CropHistory.history_id == history_id,
            CropHistory.user_id == user_id,
        )
        .first()
    )
    if history is None:
        raise HTTPException(status_code=404, detail="Crop history record not found.")
    return history


@router.get("/")
def list_crop_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = (
        db.query(CropHistory)
        .filter(CropHistory.user_id == current_user.user_id)
        .order_by(CropHistory.planted_date.desc(), CropHistory.history_id.desc())
        .all()
    )
    return [_serialize(item) for item in history]


@router.post("/", status_code=201)
def create_crop_history(
    payload: CropHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_farm(db, payload.farm_id, current_user.user_id)
    history = CropHistory(
        user_id=current_user.user_id,
        farm_id=payload.farm_id,
        crop_name=payload.crop_name.strip(),
        season=payload.season.strip() if payload.season else None,
        district=payload.district.strip() if payload.district else None,
        planted_date=payload.planted_date,
        area_acres=payload.area_acres,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return _serialize(history)


@router.put("/{history_id}")
def update_crop_history(
    history_id: int,
    payload: CropHistoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = _owned_history(db, history_id, current_user.user_id)
    updates = payload.dict(exclude_unset=True)
    if "farm_id" in updates:
        _owned_farm(db, updates["farm_id"], current_user.user_id)

    for field, value in updates.items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(history, field, value)

    db.add(history)
    db.commit()
    db.refresh(history)
    return _serialize(history)


@router.delete("/{history_id}", status_code=204)
def delete_crop_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = _owned_history(db, history_id, current_user.user_id)
    db.delete(history)
    db.commit()
