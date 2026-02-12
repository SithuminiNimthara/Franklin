import os
import shutil
import uuid
import numpy as np
import cv2

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse

app = FastAPI(title="Franklin AI Service (Merged)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Configuration
# ---------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models_data")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Render environment variables
NODE_BACKEND_URL = (os.environ.get("NODE_BACKEND_URL") or "").strip()
AI_SERVICE_URL = (os.environ.get("AI_SERVICE_URL") or "").strip()

def clean_url(url: str) -> str:
    return url.rstrip("/") if url else ""

NODE_BACKEND_URL = clean_url(NODE_BACKEND_URL)
AI_SERVICE_URL = clean_url(AI_SERVICE_URL)

# Ultralytics config dir for Render
os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp/Ultralytics")

MODEL_PATHS = {
    "unified_turtle": os.path.join(MODELS_DIR, "unified_turtle.pt"),
    "unified_predator": os.path.join(MODELS_DIR, "unified_predator.pt"),
    "shoreline": os.path.join(MODELS_DIR, "shoreline_seg.pt"),
    "hatchery": os.path.join(MODELS_DIR, "hatchery_best.pt"),
}

# ---------------------------
# Lazy singletons
# ---------------------------
unified_processor = None
shoreline_model = None
hatchery_engine = None


@app.on_event("startup")
async def startup_event():
    # Keep startup FAST (Render port scan)
    print("✅ Franklin AI starting (fast startup, lazy models)")
    print("NODE_BACKEND_URL =", NODE_BACKEND_URL)
    print("AI_SERVICE_URL   =", AI_SERVICE_URL)


@app.get("/")
def root():
    return {"status": "ok", "service": "Franklin AI Combined"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Franklin AI Combined",
        "env": {
            "node_backend": bool(NODE_BACKEND_URL),
            "ai_service_url": bool(AI_SERVICE_URL),
        },
        "models_loaded": {
            "unified": unified_processor is not None,
            "shoreline": shoreline_model is not None,
            "hatchery": hatchery_engine is not None,
            "disease": False,
        },
        "model_files_present": {
            "unified_turtle": os.path.exists(MODEL_PATHS["unified_turtle"]),
            "unified_predator": os.path.exists(MODEL_PATHS["unified_predator"]),
            "shoreline": os.path.exists(MODEL_PATHS["shoreline"]),
            "hatchery": os.path.exists(MODEL_PATHS["hatchery"]),
        }
    }


# ---------------------------
# Lazy loaders
# ---------------------------
def get_unified():
    global unified_processor
    if unified_processor is None:
        if not (os.path.exists(MODEL_PATHS["unified_turtle"]) and os.path.exists(MODEL_PATHS["unified_predator"])):
            raise HTTPException(503, "Unified model files missing in models_data/")
        try:
            from models.unified import UnifiedProcessor
            unified_processor = UnifiedProcessor(MODELS_DIR, NODE_BACKEND_URL)
            print("✅ UnifiedProcessor loaded")
        except Exception as e:
            raise HTTPException(503, f"Unified load failed: {e}")
    return unified_processor


def get_shoreline():
    global shoreline_model
    if shoreline_model is None:
        if not os.path.exists(MODEL_PATHS["shoreline"]):
            raise HTTPException(503, "Shoreline model file missing in models_data/")
        try:
            from models.shoreline import ShorelineModel, ShorelineSettings
            settings = ShorelineSettings(model_path=MODEL_PATHS["shoreline"])
            shoreline_model = ShorelineModel(settings)
            print("✅ ShorelineModel loaded")
        except Exception as e:
            raise HTTPException(503, f"Shoreline load failed: {e}")
    return shoreline_model


def get_hatchery():
    global hatchery_engine
    if hatchery_engine is None:
        if not os.path.exists(MODEL_PATHS["hatchery"]):
            raise HTTPException(503, "Hatchery model file missing in models_data/")
        try:
            from models.hatchery import HatcheryEngine
            hatchery_engine = HatcheryEngine(MODEL_PATHS["hatchery"], NODE_BACKEND_URL)
            print("✅ HatcheryEngine loaded")
        except Exception as e:
            raise HTTPException(503, f"Hatchery load failed: {e}")
    return hatchery_engine


# ---------------------------
# Unified analyze
# ---------------------------
@app.post("/ai/unified/analyze")
async def analyze_unified(file: UploadFile = File(...)):
    unified = get_unified()

    vid_id = uuid.uuid4().hex
    filename = f"{vid_id}.mp4"
    path = os.path.join(OUTPUT_DIR, filename)

    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = unified.process_video(path, filename)
        base = AI_SERVICE_URL or ""
        result["video_url"] = f"{base}/content/{filename}" if base else f"/content/{filename}"
        return result
    except Exception as e:
        raise HTTPException(500, f"Unified analyze failed: {e}")


# ---------------------------
# Shoreline
# ---------------------------
@app.post("/ai/shoreline/predict")
async def predict_shoreline(file: UploadFile = File(...)):
    shore = get_shoreline()

    content = await file.read()
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Invalid image")

    pts, conf, mask_b64 = shore.predict(img)

    h = img.shape[0]
    risk_level = "low"
    if pts:
        ys = [p.get("y") for p in pts if isinstance(p, dict) and "y" in p]
        ys = [y for y in ys if y is not None]
        if ys:
            avg = float(np.mean(ys))
            if avg < h * 0.35:
                risk_level = "high"
            elif avg < h * 0.55:
                risk_level = "medium"

    return {
        "shoreline_points": pts,
        "shoreline_conf": conf,
        "risk_level": risk_level,
        "notes": ["Shoreline detected."],
        "mask_png_b64": mask_b64,
        "image": {"w": img.shape[1], "h": img.shape[0]},
    }


# ---------------------------
# Hatchery streaming (MJPEG)
# ---------------------------
@app.post("/ai/hatchery/register_upload")
async def register_hatchery(request: Request):
    hatchery = get_hatchery()
    data = await request.json()

    vid_id = data.get("videoId")
    vid_path = data.get("videoPath")

    if not vid_id or not vid_path:
        raise HTTPException(400, "videoId and videoPath are required")

    ok = hatchery.register_video(vid_id, vid_path)
    if ok:
        return {"status": "registered", "videoId": vid_id}
    raise HTTPException(500, "Failed to register video")


@app.get("/ai/hatchery/stream/{video_id}")
def stream_hatchery(video_id: str):
    hatchery = get_hatchery()

    def iter_frames():
        src = hatchery.video_sources.get(video_id)
        if not src:
            return

        cap = cv2.VideoCapture(src)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame = hatchery.process_frame(frame, video_id, fps)

            ok2, buf = cv2.imencode(".jpg", frame)
            if not ok2:
                continue

            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")

        cap.release()

    return StreamingResponse(iter_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/ai/hatchery/data/{video_id}")
def data_hatchery(video_id: str):
    hatchery = get_hatchery()
    return hatchery.states.get(video_id, {"status": "Offline", "health": "Unknown", "species": "Unknown"})


@app.get("/content/{filename}")
async def get_content(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(404, "File not found")
