from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.ml.yield_predictor import get_karnataka_districts
from app.models.farm_profile import FarmProfile
from app.models.user import User

router = APIRouter(prefix="/farms", tags=["Farm Profiles"])


class FarmProfileCreate(BaseModel):
    farm_name: str = Field(..., min_length=2, max_length=100)
    district: str = Field(..., min_length=1, max_length=45)
    area_acres: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    soil_type: Optional[str] = Field(default=None, max_length=100)
    irrigation_type: Optional[str] = Field(default=None, max_length=100)
    primary_crop: Optional[str] = Field(default=None, max_length=100)
    season: Optional[str] = Field(default=None, max_length=45)


class FarmProfileUpdate(BaseModel):
    farm_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    district: Optional[str] = Field(default=None, min_length=1, max_length=45)
    area_acres: Optional[Decimal] = Field(
        default=None, gt=0, max_digits=10, decimal_places=2
    )
    soil_type: Optional[str] = Field(default=None, max_length=100)
    irrigation_type: Optional[str] = Field(default=None, max_length=100)
    primary_crop: Optional[str] = Field(default=None, max_length=100)
    season: Optional[str] = Field(default=None, max_length=45)


def _canonical_district(value: str) -> str:
    try:
        districts = get_karnataka_districts()
    except (OSError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load supported Karnataka districts.",
        ) from error

    district = next(
        (
            supported
            for supported in districts
            if supported.casefold() == value.strip().casefold()
        ),
        None,
    )
    if district is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Select a supported Karnataka district.",
        )
    return district


def _serialize_farm(farm: FarmProfile) -> dict:
    return {
        "farm_id": farm.farm_id,
        "farm_name": farm.farm_name,
        "state": farm.state,
        "district": farm.district,
        "area_acres": float(farm.area_acres),
        "soil_type": farm.soil_type,
        "irrigation_type": farm.irrigation_type,
        "primary_crop": farm.primary_crop,
        "season": farm.season,
    }


def _get_owned_farm(db: Session, farm_id: int, user_id: int) -> FarmProfile:
    farm = (
        db.query(FarmProfile)
        .filter(
            FarmProfile.farm_id == farm_id,
            FarmProfile.user_id == user_id,
        )
        .first()
    )
    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm profile not found.",
        )
    return farm


@router.get("/")
def list_farms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farms = (
        db.query(FarmProfile)
        .filter(FarmProfile.user_id == current_user.user_id)
        .order_by(FarmProfile.farm_id.asc())
        .all()
    )
    return [_serialize_farm(farm) for farm in farms]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_farm(
    payload: FarmProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farm_name = payload.farm_name.strip()
    if not farm_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Farm name cannot be empty.",
        )

    farm = FarmProfile(
        user_id=current_user.user_id,
        farm_name=farm_name,
        state="Karnataka",
        district=_canonical_district(payload.district),
        area_acres=payload.area_acres,
        soil_type=payload.soil_type.strip() or None if payload.soil_type else None,
        irrigation_type=(
            payload.irrigation_type.strip() or None
            if payload.irrigation_type
            else None
        ),
        primary_crop=(
            payload.primary_crop.strip() or None if payload.primary_crop else None
        ),
        season=payload.season.strip() or None if payload.season else None,
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return _serialize_farm(farm)


@router.put("/{farm_id}")
def update_farm(
    farm_id: int,
    payload: FarmProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farm = _get_owned_farm(db, farm_id, current_user.user_id)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide at least one farm field to update.",
        )

    if "farm_name" in updates:
        farm_name = updates["farm_name"].strip()
        if not farm_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Farm name cannot be empty.",
            )
        farm.farm_name = farm_name

    if "district" in updates:
        farm.district = _canonical_district(updates["district"])

    if "area_acres" in updates:
        farm.area_acres = updates["area_acres"]

    for field in ("soil_type", "irrigation_type", "primary_crop", "season"):
        if field in updates:
            value = updates[field]
            setattr(farm, field, value.strip() or None if value else None)

    db.add(farm)
    db.commit()
    db.refresh(farm)
    return _serialize_farm(farm)


@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farm = _get_owned_farm(db, farm_id, current_user.user_id)
    db.delete(farm)
    db.commit()
