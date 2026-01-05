# app.py
import os
import cv2
import numpy as np

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from dotenv import load_dotenv

from models.shoreline.model import ShorelineModel, Settings
from models.shoreline.schemas import Prediction, Health

load_dotenv()

app = FastAPI(title="TurtleGuard Shoreline Inference (Segmentation)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MODEL_PATH", "./models/shoreline/shoreline_seg_best.pt")


def env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except Exception:
        return default


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


settings = Settings(
    model_path=MODEL_PATH,
    conf=env_float("CONF", 0.25),
    img_size=env_int("IMG_SIZE", 640),
    device=os.getenv("DEVICE", "cpu"),
)

model_loaded = False
model = None


# ✅ IMPORTANT: show real validation errors instead of vague "error parsing body"
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Request validation failed",
            "errors": exc.errors(),
        },
    )


# ✅ OPTIONAL: catch any other unhandled exception to return clean JSON
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Unhandled server error: {str(exc)}"},
    )


@app.on_event("startup")
def _load():
    global model, model_loaded

    # Helpful startup logs
    print("[startup] MODEL_PATH =", settings.model_path)
    print("[startup] DEVICE     =", settings.device)

    if not os.path.exists(settings.model_path):
        print("[startup] ❌ Model not found at MODEL_PATH")
        model_loaded = False
        return

    try:
        model = ShorelineModel(settings)
        model_loaded = True
        print("[startup] ✅ Model loaded")
    except Exception as e:
        print("[startup] ❌ Failed to load model:", str(e))
        model = None
        model_loaded = False


@app.get("/health", response_model=Health)
def health():
    return {"status": "ok", "model_loaded": model_loaded}


def compute_risk(points: list[dict], img_h: int) -> tuple[str, list[str]]:
    if not points:
        return "medium", ["No shoreline detected; using conservative risk."]

    ys = [p["y"] for p in points if p.get("y") is not None]
    if not ys:
        return "medium", ["Invalid shoreline points."]

    avg_y = float(np.mean(ys))
    if avg_y < img_h * 0.35:
        return "high", ["Shoreline detected closer inland (high runup)."]
    if avg_y < img_h * 0.55:
        return "medium", ["Moderate shoreline position."]
    return "low", ["Shoreline detected closer to sea (low runup)."]


@app.post("/predict", response_model=Prediction)
async def predict(file: UploadFile = File(...)):
    # ✅ This line confirms FastAPI parsed multipart successfully
    print("[/predict] got file:", file.filename, file.content_type)

    if not model_loaded or model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Check MODEL_PATH.",
        )

    # Read file bytes
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file received.")

    # Decode as image
    img_array = np.frombuffer(content, np.uint8)
    bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if bgr is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    # Inference
    try:
        shoreline_points, shoreline_conf = model.predict(bgr)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    risk_level, notes = compute_risk(shoreline_points, bgr.shape[0])

    return {
        "shoreline_points": shoreline_points,
        "shoreline_conf": shoreline_conf,
        "risk_level": risk_level,
        "notes": notes,
    }
