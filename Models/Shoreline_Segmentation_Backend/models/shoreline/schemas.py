from pydantic import BaseModel
from typing import List, Optional, Literal


class Point(BaseModel):
    x: float
    y: float
    conf: Optional[float] = None


class ImageInfo(BaseModel):
    w: int
    h: int


class Prediction(BaseModel):
    shoreline_points: List[Point]
    shoreline_conf: float
    risk_level: Literal["low", "medium", "high"]
    notes: List[str] = []

    # ✅ Option A: mask overlay like Colab
    # base64 PNG string (NO "data:image..." prefix)
    mask_png_b64: str = ""

    # ✅ helpful metadata for frontend (video/image scaling)
    image: Optional[ImageInfo] = None


class VideoFrame(BaseModel):
    t: float
    shoreline_points: List[Point]
    shoreline_conf: float
    risk_level: Literal["low", "medium", "high"]
    notes: List[str] = []

    # ✅ per-frame mask (base64 PNG)
    mask_png_b64: str = ""

    image: ImageInfo
    frame_index: Optional[int] = None


class VideoInfo(BaseModel):
    filename: Optional[str] = None
    content_type: Optional[str] = None


class VideoPrediction(BaseModel):
    mode: Literal["video"] = "video"
    video: VideoInfo
    fps: float
    total_frames: int
    sample_every: int
    frames: List[VideoFrame]


class Health(BaseModel):
    status: str
    model_loaded: bool
