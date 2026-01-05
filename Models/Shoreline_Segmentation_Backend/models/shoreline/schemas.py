from pydantic import BaseModel
from typing import List, Optional, Literal


class Point(BaseModel):
    x: float
    y: float
    conf: Optional[float] = None


class Prediction(BaseModel):
    shoreline_points: List[Point]
    shoreline_conf: float
    risk_level: Literal["low", "medium", "high"]
    notes: List[str] = []


class Health(BaseModel):
    status: str
    model_loaded: bool
