import os
import shutil
import uuid
import numpy as np
import cv2
import time
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

# ---------------------------
# Configuration
# ---------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODELS_DIR = os.path.join(BASE_DIR, "models_data")  # Store weights here
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Environment variables (set in Render dashboard)
NODE_BACKEND_URL = os.environ.get("NODE_BACKEND_URL", "http://localhost:5002").strip()
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8000").strip()

# Fix Ultralytics config permission warnings (Render)
os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp/Ultralytics")

# Optional: disable heavy disease model in cloud to avoid 502/OOM/timeouts
DISABLE_DISEASE = os.environ.get("DISABLE_DISEASE", "false").lower() == "true"

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
disease_classifier = None


# ---------------------------
# Background warmup
# ---------------------------
async def background_warmup():
    """
    Warm models AFTER the server is already listening.
    This prevents Render's port scan / boot timeout.
    """
    await asyncio.sleep(1)

    # Warm models (optional)
    try:
        get_unified()
        print("✅ Unified ready")
    except Exception as e:
        print("❌ Unified warmup failed:", e)

    try:
        get_shoreline()
        print("✅ Shoreline ready")
    except Exception as e:
        print("❌ Shoreline warmup failed:", e)

    try:
        get_hatchery()
        print("✅ Hatchery ready")
    except Exception as e:
        print("❌ Hatchery warmup failed:", e)

    # Disease warmup is the most likely to cause OOM/timeouts in cloud.
    if DISABLE_DISEASE:
        print("⚠️ Disease warmup skipped (DISABLE_DISEASE=true).")
    else:
        try:
            get_disease()
            print("✅ Disease ready")
        except Exception as e:
            print("❌ Disease warmup failed:", e)

    # Register default tanks from test videos if they exist
    try:
        hatchery = get_hatchery()

        test_vid_dir = os.path.join(BASE_DIR, "test_videos")
        print(f"📂 Checking test videos in: {test_vid_dir}")

        for tank_id in ["tankA", "tankB", "tankC", "tankD"]:
            # Keep your existing .mov, but allow mp4 fallback too
            mov_path = os.path.join(test_vid_dir, f"{tank_id}.mov")
            mp4_path = os.path.join(test_vid_dir, f"{tank_id}.mp4")

            vid_path = mov_path if os.path.exists(mov_path) else mp4_path

            if os.path.exists(vid_path):
                hatchery.register_video(tank_id, vid_path)
                print(f"✅ Registered tank: {tank_id} with path {vid_path}")
            else:
                print(f"⚠️ Missing test video: {mov_path} / {mp4_path}")

    except Exception as e:
        print(f"❌ Default tanks registration failed: {e}")


# ---------------------------
# Lifespan (modern replacement for @app.on_event)
# ---------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Franklin AI Service starting... warming models in background (non-blocking).")
    asyncio.create_task(background_warmup())
    yield


app = FastAPI(title="Franklin AI Service (Merged)", lifespan=lifespan)

# ---------------------------
# CORS
# ---------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://franklin-frontend.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------
# Root + health (helps Render checks)
# ---------------------------
@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"status": "ok", "service": "Franklin AI Service"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Franklin AI Combined",
        "env": {
            "node_backend": bool(NODE_BACKEND_URL),
            "ai_service_url": bool(AI_SERVICE_URL),
            "disable_disease": DISABLE_DISEASE,
        },
        "models_loaded": {
            "unified": unified_processor is not None,
            "shoreline": shoreline_model is not None,
            "hatchery": hatchery_engine is not None,
            "disease": disease_classifier is not None,
        },
    }


# ---------------------------
# Lazy loaders (import only when needed)
# ---------------------------
def get_unified():
    global unified_processor
    if unified_processor is None:
        try:
            from models.unified import UnifiedProcessor
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
            hatchery_url = f"{NODE_BACKEND_URL}/api/hatchery" if NODE_BACKEND_URL else ""
            hatchery_engine = HatcheryEngine(MODEL_PATHS["hatchery"], hatchery_url)
            print(f"✅ HatcheryEngine loaded (URL: {hatchery_url})")
        except Exception as e:
            print(f"❌ Hatchery init failed: {e}")
            raise HTTPException(503, f"Hatchery engine load failed: {e}")
    return hatchery_engine


def get_disease():
    """
    NOTE: This is the most likely part to cause 502 on Render (OOM/timeout).
    Use DISABLE_DISEASE=true in Render env if needed.
    """
    global disease_classifier
    if disease_classifier is None:
        try:
            import sys

            disease_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "Disease_Detection"))
            if disease_dir not in sys.path:
                sys.path.append(disease_dir)

            from inference import DiseaseClassifier  # must exist in Disease_Detection folder

            model_path = os.path.join(disease_dir, "protonet_conv4_encoder.keras")
            support_dir = os.path.join(disease_dir, "support_set")

            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Disease model not found: {model_path}")
            if not os.path.exists(support_dir):
                raise FileNotFoundError(f"Disease support_set not found: {support_dir}")

            disease_classifier = DiseaseClassifier(model_path, support_dir)
            print("✅ DiseaseClassifier loaded lazily")
        except Exception as e:
            print(f"❌ Disease init failed: {e}")
            raise HTTPException(503, f"Disease model load failed: {e}")
    return disease_classifier


def get_disease_disabled():
    return {
        "class": "Model Disabled",
        "confidence": 0.0,
        "probabilities": {"healthy": 0.0, "fp": 0.0, "barnacles": 0.0},
        "note": "Disease detection is disabled in cloud. Set DISABLE_DISEASE=false and use a higher instance if needed.",
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

        base_url = AI_SERVICE_URL or str(request.base_url).rstrip("/")
        result["video_url"] = f"{base_url}/content/{filename}"
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/ai/unified/stream")
def stream_unified(source: str):
    """
    Stream a live camera or remote video through UnifiedProcessor.
    Uses frame-skipping to maintain real-time performance.
    """
    unified = get_unified()

    def iter_frames():
        print(f"📹 Starting unified stream for {source}")
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"❌ Failed to open video source: {source}")
            return

        frame_count = 0
        process_every = 2 # Process every 2nd frame for AI to reduce CPU load
        last_annotated = None

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                # If it's a file, loop it. 
                if not source.startswith("rtsp://"):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    success, frame = cap.read()
                    if not success: break
                else:
                    # For RTSP, wait a bit and retry OR break if persistent
                    time.sleep(1)
                    continue

            frame_count += 1
            
            # AI Inference
            if frame_count % process_every == 0 or last_annotated is None:
                # Resize for faster processing if needed
                # small_frame = cv2.resize(frame, (640, 480))
                last_annotated, _ = unified.process_frame(frame, source_id=source)
            
            # Use annotated frame for streaming
            display_frame = last_annotated if last_annotated is not None else frame

            ok, buf = cv2.imencode(".jpg", display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if not ok: continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n"
            )

            # Small delay to prevent CPU spinning 100% on empty loops
            if source.startswith("rtsp://"):
                time.sleep(0.01)

        cap.release()
        print(f"🛑 Unified stream stopped for {source}")

    return StreamingResponse(iter_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


# ---------------------------
# DISEASE ENDPOINTS
# ---------------------------
@app.post("/ai/disease/classify")
async def classify_disease(file: UploadFile = File(...)):
    # This prevents Render 502 caused by heavy TF model load on small instances
    if DISABLE_DISEASE:
        return get_disease_disabled()

    try:
        classifier = get_disease()
        content = await file.read()
        result = classifier.classify(content)

        if isinstance(result, dict) and "error" in result:
            raise HTTPException(500, result["error"])

        return result
    except HTTPException:
        raise
    except Exception as e:
        # IMPORTANT: return a normal JSON response so the proxy doesn't show 502+CORS
        print(f"❌ Disease classify error (fallback): {e}")
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
            if not ok:
                break

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
                        "frame_index": int(idx),
                    })
                except Exception as e:
                    print(f"Frame {idx} prediction failed: {e}")

                if len(frames_out) >= 300:
                    break

            idx += 1

        cap.release()

        return {
            "mode": "video",
            "fps": float(fps),
            "total_frames": int(total_frames),
            "frames": frames_out,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Video processing error: {e}")
        raise HTTPException(500, f"Video processing error: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


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
            print(f"❌ No video source for {video_id}")
            return

        print(f"📹 Starting stream for {video_id} from {path}")
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            print(f"❌ Failed to open video file: {path}")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                success, frame = cap.read()
                if not success:
                    print(f"⚠️ Reopening video {video_id}...")
                    cap.release()
                    cap = cv2.VideoCapture(path)
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

    return StreamingResponse(iter_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/ai/hatchery/data/{video_id}")
def data_hatchery(video_id: str):
    hatchery = get_hatchery()
    return hatchery.states.get(
        video_id,
        {"status": "Offline", "health": "Unknown", "species": "Unknown"},
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