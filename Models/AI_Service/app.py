import os
import shutil
import uuid
import numpy as np
import cv2

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

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

MODELS_DIR = os.path.join(BASE_DIR, "models_data")  # Store weights here
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Environment variables (set in Render dashboard)
NODE_BACKEND_URL = os.environ.get("NODE_BACKEND_URL", "").strip()
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "").strip()

# Fix Ultralytics config permission warnings
# Set this in Render env too: YOLO_CONFIG_DIR=/tmp/Ultralytics
os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp/Ultralytics")

def clean_url(url: str) -> str:
    return url.rstrip("/") if url else ""

NODE_BACKEND_URL = clean_url(NODE_BACKEND_URL)
AI_SERVICE_URL = clean_url(AI_SERVICE_URL)

MODEL_PATHS = {
    "turtle": os.path.join(MODELS_DIR, "turtle.pt"),
    "predator": os.path.join(MODELS_DIR, "predator.pt"),
    "human": os.path.join(MODELS_DIR, "human.pt"),
    "shoreline": os.path.join(MODELS_DIR, "shoreline_seg.pt"),
    "hatchery": os.path.join(MODELS_DIR, "hatchery_best.pt"),
}

# ---------------------------
# Lazy instances (Render-safe)
# ---------------------------
unified_processor = None
shoreline_model = None
hatchery_engine = None


@app.on_event("startup")
async def startup_event():
    print("Franklin AI Service starting... Pre-loading models if available.")
    # Attempt pre-loading (it's okay if they fail here, they'll retry lazily or report 503)
    try:
        get_unified()
        print("✅ Unified models pre-loaded")
    except Exception: pass

    try:
        get_shoreline()
        print("✅ Shoreline model pre-loaded")
    except Exception: pass

    try:
        get_hatchery()
        print("✅ Hatchery model pre-loaded")
    except Exception: pass


# ---------------------------
# Lazy loaders (import only when needed)
# ---------------------------
def get_unified():
    global unified_processor
    if unified_processor is None:
        try:
            from models.unified import UnifiedProcessor
            # Append detections endpoint
            detections_url = f"{NODE_BACKEND_URL}/api/detections" if NODE_BACKEND_URL else ""
            unified_processor = UnifiedProcessor(MODELS_DIR, detections_url)
            print(f"✅ UnifiedProcessor loaded (URL: {detections_url})")
        except Exception as e:
            print(f"❌ Unified init failed: {e}")
            raise HTTPException(503, f"Unified processor load failed: {e}")
    return unified_processor


def get_shoreline():
    global shoreline_model
    if shoreline_model is None:
        try:
            from models.shoreline import ShorelineModel, ShorelineSettings
            if not os.path.exists(MODEL_PATHS["shoreline"]):
                raise HTTPException(503, "Shoreline model file not found on server")
            settings = ShorelineSettings(model_path=MODEL_PATHS["shoreline"])
            shoreline_model = ShorelineModel(settings)
            print("✅ ShorelineModel loaded lazily")
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Shoreline init failed: {e}")
            raise HTTPException(503, f"Shoreline model load failed: {e}")
    return shoreline_model


def get_hatchery():
    global hatchery_engine
    if hatchery_engine is None:
        try:
            from models.hatchery import HatcheryEngine
            # Append hatchery API endpoint
            hatchery_url = f"{NODE_BACKEND_URL}/api/hatchery" if NODE_BACKEND_URL else ""
            hatchery_engine = HatcheryEngine(MODEL_PATHS["hatchery"], hatchery_url)
            print(f"✅ HatcheryEngine loaded (URL: {hatchery_url})")
        except Exception as e:
            print(f"❌ Hatchery init failed: {e}")
            raise HTTPException(503, f"Hatchery engine load failed: {e}")
    return hatchery_engine


def get_disease_disabled():
    # Tensorflow/Keras removed for deploy success on Render free tier
    return {
        "class": "Model Disabled",
        "confidence": 0.0,
        "probabilities": {
            "healthy": 0.0,
            "fp": 0.0,
            "barnacles": 0.0
        },
        "note": "Disease detection is currently disabled in cloud production to meet resource limits."
    }


# ---------------------------
# Health
# ---------------------------
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
    }


# ---------------------------
# UNIFIED ENDPOINTS
# ---------------------------
@app.post("/ai/unified/analyze")
async def analyze_unified(request: Request, file: UploadFile = File(...)):
    unified = get_unified()

    vid_id = uuid.uuid4().hex
    filename = f"{vid_id}.mp4"
    path = os.path.join(OUTPUT_DIR, filename)

    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = unified.process_video(path, filename)
        
        # Determine base URL for static content
        base_url = AI_SERVICE_URL
        if not base_url:
            base_url = str(request.base_url).rstrip("/")
            
        result["video_url"] = f"{base_url}/content/{filename}"
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


# ---------------------------
# DISEASE ENDPOINTS (DISABLED)
# ---------------------------
@app.post("/ai/disease/classify")
async def classify_disease(file: UploadFile = File(...)):
    _ = await file.read()
    return get_disease_disabled()


# ---------------------------
# SHORELINE ENDPOINTS
# ---------------------------
def shoreline_compute_risk(points: list, img_h: int) -> tuple:
    if not points:
        return "medium", ["No shoreline detected."]
    ys = [p["y"] for p in points]
    avg_y = float(np.mean(ys))
    if avg_y < img_h * 0.35:
        return "high", ["Shoreline inland (high runup)."]
    if avg_y < img_h * 0.55:
        return "medium", ["Moderate shoreline position."]
    return "low", ["Shoreline near sea (low runup)."]


@app.post("/ai/shoreline/predict")
async def predict_shoreline(file: UploadFile = File(...)):
    shore = get_shoreline()

    content = await file.read()
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Invalid image")

    pts, conf, mask_b64 = shore.predict(img)
    risk_level, notes = shoreline_compute_risk(pts, img.shape[0])

    return {
        "shoreline_points": pts,
        "shoreline_conf": float(conf),
        "risk_level": risk_level,
        "notes": notes,
        "mask_png_b64": mask_b64,
        "image": {"w": img.shape[1], "h": img.shape[0]},
    }


@app.post("/ai/shoreline/predict-video")
async def predict_video_shoreline(file: UploadFile = File(...)):
    shore = get_shoreline()
    content = await file.read()

    # Save to temp
    import tempfile
    suffix = "." + file.filename.split(".")[-1] if "." in file.filename else ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(400, "Could not open video file (unsupported codec or corrupted file)")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        sample_every = max(1, int(fps // 2))

        frames_out = []
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok: break

            if idx % sample_every == 0:
                try:
                    h, w = frame.shape[:2]
                    pts, conf, mask_b64 = shore.predict(frame)
                    risk, notes = shoreline_compute_risk(pts, h)
                    t = idx / fps

                    frames_out.append({
                        "t": float(t),
                        "shoreline_points": pts,
                        "shoreline_conf": float(conf),
                        "mask_png_b64": mask_b64,
                        "risk_level": risk,
                        "notes": notes,
                        "image": {"w": w, "h": h},
                        "frame_index": int(idx)
                    })
                except Exception as e:
                    print(f"Frame {idx} prediction failed: {e}")
                
                if len(frames_out) >= 300: break
            idx += 1
        cap.release()

        return {
            "mode": "video",
            "fps": float(fps),
            "total_frames": int(total_frames),
            "frames": frames_out
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Video processing error: {e}")
        raise HTTPException(500, f"Video processing error: {str(e)}")
    finally:
        if os.path.exists(tmp_path): os.remove(tmp_path)


# ---------------------------
# HATCHERY ENDPOINTS
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
        path = hatchery.video_sources.get(video_id)
        if not path:
            return

        cap = cv2.VideoCapture(path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame = hatchery.process_frame(frame, video_id, fps)

            ok, buf = cv2.imencode(".jpg", frame)
            if not ok:
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n"
            )

        cap.release()

    return StreamingResponse(
        iter_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/ai/hatchery/data/{video_id}")
def data_hatchery(video_id: str):
    hatchery = get_hatchery()
    return hatchery.states.get(
        video_id,
        {"status": "Offline", "health": "Unknown", "species": "Unknown"}
    )


# ---------------------------
# Static content output
# ---------------------------
@app.get("/content/{filename}")
async def get_content(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(404, "File not found")


# ---------------------------
# Local run
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
