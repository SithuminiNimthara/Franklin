# app.py
import os
import cv2
import numpy as np
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from dotenv import load_dotenv

from models.shoreline.model import ShorelineModel, Settings
from models.shoreline.schemas import Health  # ✅ Prediction schema likely needs update for mask

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
    """
    Simple demo risk based on how 'inland' the shoreline is in the image.
    Adjust thresholds to match your camera angle.
    """
    if not points:
        return "medium", ["No shoreline detected; using conservative risk."]

    ys = [p["y"] for p in points if p.get("y") is not None]
    if not ys:
        return "medium", ["Invalid shoreline points."]

    avg_y = float(np.mean(ys))

    # NOTE: y increases downward (top=0). Smaller y => higher up in image.
    if avg_y < img_h * 0.35:
        return "high", ["Shoreline detected closer inland (high runup)."]
    if avg_y < img_h * 0.55:
        return "medium", ["Moderate shoreline position."]
    return "low", ["Shoreline detected closer to sea (low runup)."]


# ✅ NOTE:
# You previously had response_model=Prediction.
# After adding mask_png_b64, your Prediction schema must include it,
# OR remove response_model to avoid FastAPI validation errors.
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    print("[/predict] got file:", file.filename, file.content_type)

    if not model_loaded or model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Check MODEL_PATH.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file received.")

    img_array = np.frombuffer(content, np.uint8)
    bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if bgr is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    try:
        # ✅ UPDATED: model now returns (points, conf, mask_png_b64)
        shoreline_points, shoreline_conf, mask_png_b64 = model.predict(bgr)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    risk_level, notes = compute_risk(shoreline_points, bgr.shape[0])

    return {
        "shoreline_points": shoreline_points,
        "shoreline_conf": float(shoreline_conf),
        "risk_level": risk_level,
        "notes": notes,
        # ✅ NEW: base64 PNG mask for Colab-like overlay
        "mask_png_b64": mask_png_b64,
        # ✅ helpful to frontend if needed
        "image": {"w": int(bgr.shape[1]), "h": int(bgr.shape[0])},
    }


@app.post("/predict-video")
async def predict_video(file: UploadFile = File(...)):
    """
    Upload an mp4 (or similar) and get shoreline points + mask over time.
    Returns frames=[{t, shoreline_points, shoreline_conf, mask_png_b64, risk_level, notes, image{w,h}}]

    Sampling defaults:
      - process about 2 frames per second (fps//2)
      - max 300 sampled frames (safety)
    """
    print("[/predict-video] got file:", file.filename, file.content_type)

    if not model_loaded or model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Check MODEL_PATH.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file received.")

    # Choose suffix by content type / filename (helps VideoCapture sometimes)
    suffix = ".mp4"
    if file.filename and "." in file.filename:
        suffix = "." + file.filename.split(".")[-1].lower()

    tmp_path = None
    try:
        # Save to temp file because cv2.VideoCapture works best with file paths
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Invalid video or unsupported codec.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

        # process ~2 frames per second
        sample_every = max(1, int(fps // 2))

        frames_out = []
        idx = 0

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            if idx % sample_every == 0:
                img_h, img_w = frame.shape[:2]

                try:
                    # ✅ UPDATED: model returns mask for overlay
                    shoreline_points, shoreline_conf, mask_png_b64 = model.predict(frame)
                    risk_level, notes = compute_risk(shoreline_points, img_h)
                except Exception as e:
                    shoreline_points, shoreline_conf, mask_png_b64 = [], 0.0, ""
                    risk_level, notes = "medium", [f"Inference error at frame {idx}: {str(e)}"]

                t = idx / float(fps if fps > 0 else 25.0)

                frames_out.append(
                    {
                        "t": float(t),
                        "shoreline_points": shoreline_points,  # PIXELS (polyline)
                        "shoreline_conf": float(shoreline_conf),
                        # ✅ NEW: mask overlay (base64 PNG)
                        "mask_png_b64": mask_png_b64,
                        "risk_level": risk_level,
                        "notes": notes,
                        "image": {"w": int(img_w), "h": int(img_h)},
                        "frame_index": int(idx),
                    }
                )

                # Safety cap so huge videos don't overload response
                if len(frames_out) >= 300:
                    break

            idx += 1

        cap.release()

        return {
            "mode": "video",
            "video": {
                "filename": file.filename,
                "content_type": file.content_type,
            },
            "fps": float(fps),
            "total_frames": int(total_frames),
            "sample_every": int(sample_every),
            "frames": frames_out,
        }

    finally:
        # cleanup temp file
        try:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
