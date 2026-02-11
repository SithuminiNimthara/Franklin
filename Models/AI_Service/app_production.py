import os
import shutil
import uuid
import traceback
import logging
from typing import Optional
import numpy as np
import cv2

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Franklin AI Service (Production)")

# CORS
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

# Environment variables
NODE_BACKEND_URL = os.environ.get("NODE_BACKEND_URL", "").strip().rstrip("/")
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "").strip().rstrip("/")
MAX_UPLOAD_SIZE = int(os.environ.get("MAX_UPLOAD_SIZE_MB", "100")) * 1024 * 1024  # 100MB default

# Ultralytics config
os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp/Ultralytics")

logger.info(f"🚀 Franklin AI Service Starting...")
logger.info(f"📁 Models Dir: {MODELS_DIR}")
logger.info(f"📁 Output Dir: {OUTPUT_DIR}")
logger.info(f"🔗 Node Backend: {NODE_BACKEND_URL or 'Not Set'}")
logger.info(f"🔗 AI Service URL: {AI_SERVICE_URL or 'Not Set'}")

# Model paths
MODEL_PATHS = {
    "unified_turtle": os.path.join(MODELS_DIR, "unified_turtle.pt"),
    "unified_predator": os.path.join(MODELS_DIR, "unified_predator.pt"),
    "shoreline": os.path.join(MODELS_DIR, "shoreline_seg.pt"),
    "hatchery": os.path.join(MODELS_DIR, "hatchery_best.pt"),
}

# Lazy instances
unified_processor = None
shoreline_model = None
hatchery_engine = None

# ---------------------------
# Startup
# ---------------------------
@app.on_event("startup")
async def startup_event():
    logger.info("✅ FastAPI startup complete (lazy model loading enabled)")
    
    # Log model file status
    for name, path in MODEL_PATHS.items():
        exists = os.path.exists(path)
        status = "✅ Found" if exists else "❌ Missing"
        logger.info(f"   {status}: {name} at {path}")

# ---------------------------
# Exception Handler
# ---------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Unhandled exception on {request.method} {request.url.path}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": str(request.url.path),
            "type": type(exc).__name__
        }
    )

# ---------------------------
# Lazy Loaders
# ---------------------------
def get_unified():
    global unified_processor
    if unified_processor is None:
        try:
            logger.info("🔄 Loading UnifiedProcessor...")
            from models.unified import UnifiedProcessor
            unified_processor = UnifiedProcessor(MODELS_DIR, NODE_BACKEND_URL)
            logger.info("✅ UnifiedProcessor loaded")
        except Exception as e:
            logger.error(f"❌ Unified init failed: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(503, f"Unified processor load failed: {str(e)}")
    return unified_processor


def get_shoreline():
    global shoreline_model
    if shoreline_model is None:
        try:
            logger.info("🔄 Loading ShorelineModel...")
            from models.shoreline import ShorelineModel, ShorelineSettings
            
            if not os.path.exists(MODEL_PATHS["shoreline"]):
                raise FileNotFoundError(f"Shoreline model not found: {MODEL_PATHS['shoreline']}")
            
            settings = ShorelineSettings(model_path=MODEL_PATHS["shoreline"])
            shoreline_model = ShorelineModel(settings)
            logger.info("✅ ShorelineModel loaded")
        except Exception as e:
            logger.error(f"❌ Shoreline init failed: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(503, f"Shoreline model load failed: {str(e)}")
    return shoreline_model


def get_hatchery():
    global hatchery_engine
    if hatchery_engine is None:
        try:
            logger.info("🔄 Loading HatcheryEngine...")
            from models.hatchery import HatcheryEngine
            hatchery_engine = HatcheryEngine(MODEL_PATHS["hatchery"], NODE_BACKEND_URL)
            logger.info("✅ HatcheryEngine loaded")
        except Exception as e:
            logger.error(f"❌ Hatchery init failed: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(503, f"Hatchery engine load failed: {str(e)}")
    return hatchery_engine

# ---------------------------
# Health & Info Routes
# ---------------------------
@app.get("/")
def root():
    return {
        "service": "Franklin AI Service",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "debug": "/debug/info",
            "unified_analyze": "POST /ai/unified/analyze",
            "disease_classify": "POST /ai/disease/classify (disabled)",
            "shoreline_predict": "POST /ai/shoreline/predict",
            "hatchery_register": "POST /ai/hatchery/register_upload",
            "hatchery_stream": "GET /ai/hatchery/stream/{video_id}",
            "hatchery_data": "GET /ai/hatchery/data/{video_id}",
            "content": "GET /content/{filename}"
        }
    }


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


@app.get("/debug/info")
def debug_info():
    """Debug endpoint to check model files and environment"""
    return {
        "directories": {
            "base": BASE_DIR,
            "models": MODELS_DIR,
            "output": OUTPUT_DIR,
        },
        "model_files": {
            name: {
                "path": path,
                "exists": os.path.exists(path),
                "size_mb": round(os.path.getsize(path) / 1024 / 1024, 2) if os.path.exists(path) else 0
            }
            for name, path in MODEL_PATHS.items()
        },
        "models_dir_contents": os.listdir(MODELS_DIR) if os.path.exists(MODELS_DIR) else [],
        "environment": {
            "NODE_BACKEND_URL": bool(NODE_BACKEND_URL),
            "AI_SERVICE_URL": bool(AI_SERVICE_URL),
            "YOLO_CONFIG_DIR": os.environ.get("YOLO_CONFIG_DIR"),
        }
    }

# ---------------------------
# File Validation
# ---------------------------
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/avi", "video/quicktime", "video/x-msvideo"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg"}

def validate_upload(file: UploadFile, allowed_types: set, max_size: int = MAX_UPLOAD_SIZE):
    """Validate uploaded file"""
    # Check content type
    if file.content_type not in allowed_types:
        raise HTTPException(
            400, 
            f"Invalid file type: {file.content_type}. Allowed: {', '.join(allowed_types)}"
        )
    
    # Check file size (read first chunk to estimate)
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset
    
    if size > max_size:
        raise HTTPException(
            400,
            f"File too large: {size / 1024 / 1024:.2f}MB. Max: {max_size / 1024 / 1024}MB"
        )
    
    if size == 0:
        raise HTTPException(400, "Empty file uploaded")
    
    logger.info(f"✅ File validated: {file.filename} ({size / 1024 / 1024:.2f}MB)")

# ---------------------------
# UNIFIED ENDPOINTS
# ---------------------------
@app.post("/ai/unified/analyze")
async def analyze_unified(file: UploadFile = File(...)):
    """Analyze video for turtle/predator/human detection"""
    try:
        logger.info(f"📹 Received video upload: {file.filename}")
        
        # Validate upload
        validate_upload(file, ALLOWED_VIDEO_TYPES)
        
        # Load model
        unified = get_unified()
        
        # Save uploaded file
        vid_id = uuid.uuid4().hex
        filename = f"{vid_id}.mp4"
        path = os.path.join(OUTPUT_DIR, filename)
        
        logger.info(f"💾 Saving to: {path}")
        with open(path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Verify file was saved
        if not os.path.exists(path):
            raise Exception(f"Failed to save file to {path}")
        
        file_size = os.path.getsize(path)
        logger.info(f"✅ File saved: {file_size / 1024 / 1024:.2f}MB")
        
        # Process video
        logger.info(f"🔄 Processing video...")
        result = unified.process_video(path, filename)
        
        # Add video URL
        if AI_SERVICE_URL:
            result["video_url"] = f"{AI_SERVICE_URL}/content/{filename}"
        else:
            result["video_url"] = f"/content/{filename}"
        
        logger.info(f"✅ Analysis complete: {len(result.get('data', []))} frames processed")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in analyze_unified: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(500, f"Video analysis failed: {str(e)}")


# ---------------------------
# DISEASE ENDPOINTS (DISABLED)
# ---------------------------
@app.post("/ai/disease/classify")
async def classify_disease(file: UploadFile = File(...)):
    """Disease classification - DISABLED (TensorFlow removed for deployment)"""
    return JSONResponse(
        status_code=503,
        content={
            "error": "Service Unavailable",
            "message": "Disease model disabled on Render (TensorFlow removed for fast deployment)",
            "recommendation": "Use TensorFlow Lite or deploy disease model separately with GPU support"
        }
    )


# ---------------------------
# SHORELINE ENDPOINTS
# ---------------------------
@app.post("/ai/shoreline/predict")
async def predict_shoreline(file: UploadFile = File(...)):
    """Predict shoreline from image"""
    try:
        logger.info(f"🏖️ Received shoreline image: {file.filename}")
        
        # Validate
        validate_upload(file, ALLOWED_IMAGE_TYPES, max_size=10 * 1024 * 1024)  # 10MB max for images
        
        # Load model
        shore = get_shoreline()
        
        # Read image
        content = await file.read()
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(400, "Invalid image file - cannot decode")
        
        logger.info(f"📐 Image size: {img.shape}")
        
        # Predict
        pts, conf, mask_b64 = shore.predict(img)
        
        # Risk logic
        h = img.shape[0]
        risk_level = "low"
        notes = ["Shoreline detected."]
        
        if pts:
            ys = [p["y"] for p in pts if "y" in p]
            if ys:
                avg = float(np.mean(ys))
                if avg < h * 0.35:
                    risk_level = "high"
                elif avg < h * 0.55:
                    risk_level = "medium"
        
        logger.info(f"✅ Shoreline prediction complete: {risk_level} risk")
        
        return {
            "shoreline_points": pts,
            "shoreline_conf": conf,
            "risk_level": risk_level,
            "notes": notes,
            "mask_png_b64": mask_b64,
            "image": {"w": img.shape[1], "h": img.shape[0]},
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in predict_shoreline: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(500, f"Shoreline prediction failed: {str(e)}")


# ---------------------------
# HATCHERY ENDPOINTS
# ---------------------------
@app.post("/ai/hatchery/register_upload")
async def register_hatchery(request: Request):
    """Register hatchery video for processing"""
    try:
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in register_hatchery: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(500, f"Hatchery registration failed: {str(e)}")


@app.get("/ai/hatchery/stream/{video_id}")
def stream_hatchery(video_id: str):
    """Stream hatchery video with detections"""
    try:
        hatchery = get_hatchery()
        
        def iter_frames():
            path = hatchery.video_sources.get(video_id)
            if not path:
                logger.warning(f"Video ID not found: {video_id}")
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
        
    except Exception as e:
        logger.error(f"❌ Error in stream_hatchery: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(500, f"Hatchery stream failed: {str(e)}")


@app.get("/ai/hatchery/data/{video_id}")
def data_hatchery(video_id: str):
    """Get hatchery data for video"""
    try:
        hatchery = get_hatchery()
        return hatchery.states.get(
            video_id,
            {"status": "Offline", "health": "Unknown", "species": "Unknown"}
        )
    except Exception as e:
        logger.error(f"❌ Error in data_hatchery: {e}")
        raise HTTPException(500, f"Failed to get hatchery data: {str(e)}")


# ---------------------------
# Static Content
# ---------------------------
@app.get("/content/{filename}")
async def get_content(filename: str):
    """Serve processed video/image content"""
    try:
        # Security: prevent path traversal
        if ".." in filename or "/" in filename:
            raise HTTPException(400, "Invalid filename")
        
        path = os.path.join(OUTPUT_DIR, filename)
        
        if not os.path.exists(path):
            raise HTTPException(404, f"File not found: {filename}")
        
        return FileResponse(path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error serving content: {e}")
        raise HTTPException(500, f"Failed to serve content: {str(e)}")


# ---------------------------
# Local Run
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
