import os
import shutil
import uuid
import numpy as np
import cv2
import requests
import time
import asyncio
from tempfile import NamedTemporaryFile
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from dotenv import load_dotenv

load_dotenv()

# ---------------------------
# App Initialization
# ---------------------------
app = FastAPI(title="Franklin AI Service (Production)")

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
# Configuration
# ---------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models_data")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Environment variables (set in Render dashboard)
NODE_BACKEND_URL = os.environ.get("NODE_BACKEND_URL", "http://localhost:5002").strip()
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8000").strip()

# If running on Render, ensure config dir is writeable
os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp/Ultralytics")

# Model Weight URLs (Set in Render env)
WEIGHT_URLS = {
    "unified_turtle": os.environ.get("UNIFIED_TURTLE_URL"),
    "unified_predator": os.environ.get("UNIFIED_PREDATOR_URL"),
    "shoreline": os.environ.get("SHORELINE_URL"),
    "hatchery": os.environ.get("HATCHERY_URL"),
}

MODEL_PATHS = {
    "unified_turtle": os.path.join(MODELS_DIR, "unified_turtle.pt"),
    "unified_predator": os.path.join(MODELS_DIR, "unified_predator.pt"),
    "shoreline": os.path.join(MODELS_DIR, "shoreline_seg.pt"),
    "hatchery": os.path.join(MODELS_DIR, "hatchery_best.pt"),
}

# ---------------------------
# Lazy Singletons
# ---------------------------
unified_processor = None
shoreline_model = None
hatchery_engine = None

@app.on_event("startup")
async def startup_event():
    print("✅ Franklin AI Service starting...")

    try:
        hatchery = get_hatchery()

        test_video_dir = os.path.join(BASE_DIR, "test_videos")
        demo_sources = {
            "tankA": os.path.join(test_video_dir, "tankA.mov"),
            "tankB": os.path.join(test_video_dir, "tankB.mov"),
            "tankC": os.path.join(test_video_dir, "tankC.mov"),
            "tankD": os.path.join(test_video_dir, "tankD.mov"),
        }

        for vid, path in demo_sources.items():
            if os.path.exists(path):
                hatchery.register_video(vid, path)
                print(f"✅ Registered {vid}: {path}")
            else:
                print(f"⚠️ Missing demo video for {vid}: {path}")

    except Exception as e:
        print(f"⚠️ Hatchery startup registration failed: {e}")
# ---------------------------
# Weight downloader
# ---------------------------
def ensure_weight_exists(model_key):
    path = MODEL_PATHS.get(model_key)
    if not path:
        return False
    
    if os.path.exists(path) and os.path.getsize(path) > 1024:
        return True
    
    url = WEIGHT_URLS.get(model_key)
    if not url:
        print(f"⚠️ Model weight missing: {model_key} and no URL provided in env.")
        return False
    
    print(f"⬇️ Downloading weight for {model_key} from {url}")
    try:
        r = requests.get(url, stream=True, timeout=30)
        r.raise_for_status()
        with open(path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ Success: {model_key}")
        return True
    except Exception as e:
        print(f"❌ Failed to download {model_key}: {e}")
        return False

# ---------------------------
# Lazy Loaders
# ---------------------------
def get_unified():
    global unified_processor
    if unified_processor is None:
        ensure_weight_exists("unified_turtle")
        ensure_weight_exists("unified_predator")
        
        # Check files again
        if not (os.path.exists(MODEL_PATHS["unified_turtle"]) and os.path.exists(MODEL_PATHS["unified_predator"])):
            raise HTTPException(503, "Unified model weights missing. Check /health for details.")
            
        try:
            from models.unified import UnifiedProcessor
            unified_processor = UnifiedProcessor(MODELS_DIR, NODE_BACKEND_URL)
            print("✅ UnifiedProcessor initialized")
        except Exception as e:
            raise HTTPException(503, f"Failed to Load Unified Processor: {e}")
    return unified_processor

def get_shoreline():
    global shoreline_model
    if shoreline_model is None:
        ensure_weight_exists("shoreline")
        if not os.path.exists(MODEL_PATHS["shoreline"]):
            raise HTTPException(503, "Shoreline weights missing.")
            
        try:
            from models.shoreline import ShorelineModel, ShorelineSettings
            settings = ShorelineSettings(model_path=MODEL_PATHS["shoreline"])
            shoreline_model = ShorelineModel(settings)
            print("✅ ShorelineModel initialized")
        except Exception as e:
            raise HTTPException(503, f"Failed to load Shoreline model: {e}")
    return shoreline_model

def get_hatchery():
    global hatchery_engine
    if hatchery_engine is None:
        ensure_weight_exists("hatchery")
        if not os.path.exists(MODEL_PATHS["hatchery"]):
            raise HTTPException(503, "Hatchery weights missing.")
            
        try:
            from models.hatchery import HatcheryEngine
            hatchery_engine = HatcheryEngine(MODEL_PATHS["hatchery"], NODE_BACKEND_URL)
            print("✅ HatcheryEngine initialized")
        except Exception as e:
            raise HTTPException(503, f"Failed to load Hatchery engine: {e}")
    return hatchery_engine

# ---------------------------
# Routes
# ---------------------------

@app.get("/")
def root():
    return {
        "service": "Franklin AI Service", 
        "status": "online",
        "endpoints": [
            "/health",
            "/ai/unified/analyze",
            "/ai/shoreline/predict",
            "/ai/shoreline/predict-video",
            "/ai/hatchery/register_upload"
        ]
    }

@app.get("/health")
def health(request: Request):
    return {
        "status": "ok",
        "env": {
            "node_backend": NODE_BACKEND_URL,
            "ai_service_url": AI_SERVICE_URL,
            "detected_base": str(request.base_url).rstrip("/")
        },
        "models": {
            "unified": unified_processor is not None,
            "shoreline": shoreline_model is not None,
            "hatchery": hatchery_engine is not None,
        },
        "weights": {k: os.path.exists(v) for k, v in MODEL_PATHS.items()}
    }

@app.post("/ai/unified/analyze")
async def analyze_unified(request: Request, file: UploadFile = File(...)):
    processor = get_unified()
    
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
        process_every = 3 # Process every 3rd frame for AI to reduce CPU load
        last_annotated = None
        target_size = (640, 360) # Standard 16:9 for faster inference

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
                # Resize for MUCH faster processing
                small_frame = cv2.resize(frame, target_size)
                last_annotated, _ = unified.process_frame(small_frame, source_id=source)
            
            # Use annotated frame for streaming
            display_frame = last_annotated if last_annotated is not None else frame

            # Encode with slightly lower quality for faster transmission
            ok, buf = cv2.imencode(".jpg", display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if not ok:
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n"
            )

            # Small delay to prevent CPU spinning 100% on empty loops
            if source.startswith("rtsp://"):
                # Reduced sleep for better responsiveness
                time.sleep(0.005)

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
    except Exception as e:
        raise HTTPException(500, f"Analysis Error: {e}")

@app.post("/ai/shoreline/predict")
async def predict_shoreline(file: UploadFile = File(...)):
    shore = get_shoreline()
    content = await file.read()
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(400, "Could not decode image.")

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

@app.post("/ai/shoreline/predict-video")
async def predict_shoreline_video(file: UploadFile = File(...)):
    shore = get_shoreline()
    content = await file.read()

    if not content:
        raise HTTPException(400, "Empty file received.")

    suffix = ".mp4"
    if file.filename and "." in file.filename:
        suffix = "." + file.filename.split(".")[-1].lower()

    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(400, "Invalid video or unsupported codec.")

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
                img_h, img_w = frame.shape[:2]

                try:
                    shoreline_points, shoreline_conf, mask_png_b64 = shore.predict(frame)

                    ys = [p.get("y") for p in shoreline_points if isinstance(p, dict) and "y" in p]
                    ys = [y for y in ys if y is not None]

                    risk_level = "low"
                    notes = ["Shoreline detected."]
                    if ys:
                        avg = float(np.mean(ys))
                        if avg < img_h * 0.35:
                            risk_level = "high"
                            notes = ["Shoreline detected closer inland (high runup)."]
                        elif avg < img_h * 0.55:
                            risk_level = "medium"
                            notes = ["Moderate shoreline position."]
                    elif not shoreline_points:
                        risk_level = "medium"
                        notes = ["No shoreline detected; using conservative risk."]

                except Exception as e:
                    shoreline_points, shoreline_conf, mask_png_b64 = [], 0.0, ""
                    risk_level, notes = "medium", [f"Inference error at frame {idx}: {str(e)}"]

                t = idx / float(fps if fps > 0 else 25.0)

                frames_out.append({
                    "t": float(t),
                    "shoreline_points": shoreline_points,
                    "shoreline_conf": float(shoreline_conf),
                    "mask_png_b64": mask_png_b64,
                    "risk_level": risk_level,
                    "notes": notes,
                    "image": {"w": int(img_w), "h": int(img_h)},
                    "frame_index": int(idx),
                })

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
        try:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass

@app.post("/ai/hatchery/register_upload")
async def register_hatchery(request: Request):
    hatchery = get_hatchery()
    data = await request.json()
    vid_id, vid_path = data.get("videoId"), data.get("videoPath")
    
    if not vid_id or not vid_path:
        raise HTTPException(400, "videoId and videoPath are required.")

    if hatchery.register_video(vid_id, vid_path):
        return {"status": "registered", "videoId": vid_id}
    raise HTTPException(500, "Registration failed.")

@app.get("/ai/hatchery/stream/{video_id}")
def stream_hatchery(video_id: str):
    hatchery = get_hatchery()
    
    def iter_frames():
        src = hatchery.video_sources.get(video_id)
        if not src:
            return
        
        cap = cv2.VideoCapture(src)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
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
    raise HTTPException(404, "Content not found.")

@app.post("/ai/disease/classify")
async def classify_disease():
    return JSONResponse(
        status_code=503,
        content={"message": "Disease model is currently disabled in this lightweight deployment."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))