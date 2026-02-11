# Franklin Production Debugging & Fix Guide

## 1. ROOT CAUSES (Ranked by Likelihood)

### 🔴 **CRITICAL - Rank 1: Missing Model Files on Render**
**Symptom:** POST `/ai/unified/analyze` returns 500 Internal Server Error
**Root Cause:** The model files (`unified_turtle.pt`, `unified_predator.pt`) are NOT uploaded to Render
- Your code tries to load models from `models_data/` directory
- These `.pt` files are likely in `.gitignore` (they're large binary files)
- Render doesn't have access to these files during deployment
- When `unified.process_video()` calls `self.load_model('turtle')`, it returns `None`
- Then `model_t(frame)` crashes because `model_t` is `None`

**Evidence:**
```python
# unified.py line 71-72
model_t = self.load_model('turtle')
if model_t:  # This is None if file doesn't exist
    res = model_t(frame, verbose=False, conf=0.5)  # ❌ Crashes if model_t is None
```

### 🟠 **HIGH - Rank 2: Insufficient Error Logging**
**Symptom:** Generic 500 error with no traceback
**Root Cause:** Your app.py catches exceptions but doesn't log them properly
```python
# app.py line 182-183
except Exception as e:
    raise HTTPException(500, str(e))  # ❌ No traceback logged
```

### 🟡 **MEDIUM - Rank 3: File Upload Validation Missing**
**Symptom:** Could fail on invalid uploads
**Root Cause:** No validation for:
- File type (could upload .txt instead of .mp4)
- File size (could upload 5GB file)
- Empty file uploads

### 🟡 **MEDIUM - Rank 4: Backend Route Mismatches**
**Symptom:** 404 on `/profile/me/settings`, `/health/stats`, etc.
**Root Cause:** Frontend calls routes without `/api` prefix or backend doesn't expose them
- Frontend: `${API_BASE_URL}/health/stats` → Should be `/api/health/stats`
- Frontend: `${API_BASE_URL}/profile/me/settings` → Backend has `/api/profile/me/settings`

### 🟢 **LOW - Rank 5: RTSP Streaming on Render**
**Symptom:** `/streams/:id/stream.m3u8` returns 404
**Root Cause:** Render doesn't support persistent RTSP camera connections
- Render uses ephemeral containers (restart frequently)
- No persistent storage for HLS segments
- RTSP requires continuous connection to IP cameras
- Your backend serves HLS from local disk (`/streams` static directory)

---

## 2. STEP-BY-STEP DEBUGGING PLAN

### Step 1: Check Render Logs for Actual Error
```bash
# In Render dashboard → Your AI Service → Logs
# Look for lines after "POST /ai/unified/analyze"
# You should see Python traceback
```

**Expected to see:**
```
AttributeError: 'NoneType' object has no attribute '__call__'
# OR
FileNotFoundError: [Errno 2] No such file or directory: '/opt/render/project/src/models_data/unified_turtle.pt'
```

### Step 2: Verify Model Files Exist
```bash
# SSH into Render (if available) or add debug endpoint
# Add this to app.py temporarily:

@app.get("/debug/files")
def debug_files():
    import os
    return {
        "models_dir": MODELS_DIR,
        "models_exist": {
            "turtle": os.path.exists(MODEL_PATHS.get("unified_turtle", "")),
            "predator": os.path.exists(MODEL_PATHS.get("unified_predator", "")),
            "shoreline": os.path.exists(MODEL_PATHS.get("shoreline", "")),
            "hatchery": os.path.exists(MODEL_PATHS.get("hatchery", "")),
        },
        "models_dir_contents": os.listdir(MODELS_DIR) if os.path.exists(MODELS_DIR) else []
    }
```

**Visit:** `https://franklin-ai.onrender.com/debug/files`

### Step 3: Test with Minimal Video
```bash
# Create a 1-second test video locally
ffmpeg -f lavfi -i testsrc=duration=1:size=640x480:rate=30 -pix_fmt yuv420p test.mp4

# Upload to your endpoint
curl -X POST https://franklin-ai.onrender.com/ai/unified/analyze \
  -F "file=@test.mp4" \
  -v
```

### Step 4: Check Environment Variables
```bash
# In Render dashboard, verify:
NODE_BACKEND_URL=https://franklin-backend-v0i3.onrender.com/api/detections
AI_SERVICE_URL=https://franklin-ai.onrender.com
YOLO_CONFIG_DIR=/tmp/Ultralytics
PORT=8000
```

### Step 5: Monitor Memory Usage
```bash
# Render free tier has 512MB RAM limit
# YOLO models can use 200-500MB each
# If loading all 3 models → OOM crash
```

---

## 3. UPDATED PRODUCTION-READY app.py

```python
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
```

---

## 4. RENDER CONFIGURATION

### Build Command
```bash
pip install --upgrade pip && pip install -r requirements.txt
```

### Start Command
```bash
uvicorn app:app --host 0.0.0.0 --port $PORT --log-level info
```

### Environment Variables
```bash
# Required
NODE_BACKEND_URL=https://franklin-backend-v0i3.onrender.com/api/detections
AI_SERVICE_URL=https://franklin-ai.onrender.com
YOLO_CONFIG_DIR=/tmp/Ultralytics
PORT=8000

# Optional
MAX_UPLOAD_SIZE_MB=100
PYTHON_VERSION=3.11.0
```

### Python Version
**Recommended:** `3.11.x` (set in `runtime.txt`)

```txt
python-3.11.0
```

### ⚠️ **CRITICAL: Upload Model Files**

**Option A: Use Render Disk Storage (Paid)**
1. Add persistent disk in Render dashboard
2. Mount at `/opt/render/models`
3. Upload `.pt` files via SFTP/SCP
4. Update `MODELS_DIR = "/opt/render/models"`

**Option B: Download from Cloud Storage (Recommended)**
Add to `app.py` startup:
```python
@app.on_event("startup")
async def startup_event():
    # Download models from S3/GCS/etc
    import requests
    
    model_urls = {
        "unified_turtle.pt": "https://your-storage.com/unified_turtle.pt",
        "unified_predator.pt": "https://your-storage.com/unified_predator.pt",
    }
    
    for filename, url in model_urls.items():
        path = os.path.join(MODELS_DIR, filename)
        if not os.path.exists(path):
            logger.info(f"📥 Downloading {filename}...")
            r = requests.get(url, stream=True)
            with open(path, 'wb') as f:
                shutil.copyfileobj(r.raw, f)
            logger.info(f"✅ Downloaded {filename}")
```

**Option C: Bake into Docker Image**
Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY . .

# Copy model files (add to repo with Git LFS)
COPY models_data/*.pt /app/models_data/

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 5. FRONTEND CONFIG (shared/config.js)

```javascript
// Centralized API Configuration
const cleanUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

// Backend API (Node.js)
export const API_BASE_URL =
    cleanUrl(import.meta.env.VITE_API_BASE_URL) || "http://localhost:5002";

// AI Service (FastAPI)
export const AI_BASE_URL =
    cleanUrl(import.meta.env.VITE_AI_SERVICE_URL) || "http://localhost:8000";

// Helper functions
export const getApiUrl = (endpoint) =>
    `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

export const getAiUrl = (endpoint) =>
    `${AI_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

// Stream URLs (served by backend)
export const getStreamUrl = (cameraId) => 
    `${API_BASE_URL}/streams/${cameraId}/stream.m3u8`;

// Model URLs (all point to AI service)
export const UNIFIED_MODEL_URL = AI_BASE_URL;
export const DISEASE_MODEL_URL = AI_BASE_URL;
export const SHORELINE_MODEL_URL = AI_BASE_URL;
export const HATCHERY_MODEL_URL = AI_BASE_URL;
```

### Frontend .env (Production)
```bash
VITE_API_BASE_URL=https://franklin-backend-v0i3.onrender.com
VITE_AI_SERVICE_URL=https://franklin-ai.onrender.com
```

### Update Frontend API Calls
```javascript
// ❌ OLD (hardcoded localhost)
fetch('http://localhost:8000/analyze', ...)

// ✅ NEW (uses environment)
import { getAiUrl } from '../../shared/config';
fetch(getAiUrl('/ai/unified/analyze'), ...)

// ❌ OLD (missing /api prefix)
fetch(`${API_BASE_URL}/health/stats`)

// ✅ NEW (correct prefix)
fetch(getApiUrl('/api/health/stats'))
```

---

## 6. CCTV STREAMING ARCHITECTURE

### ❌ **Why Render Can't Handle RTSP Directly**

1. **Ephemeral Containers:** Render restarts containers frequently → RTSP connection drops
2. **No Persistent Storage:** HLS segments written to disk are lost on restart
3. **No UDP Support:** RTSP often uses UDP which Render doesn't support well
4. **Memory Limits:** Free tier has 512MB RAM → can't handle multiple camera streams

### ✅ **Recommended Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION CCTV SETUP                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│ IP Camera    │ RTSP
│ (Beach Site) │────────┐
└──────────────┘        │
                        ▼
┌──────────────┐   ┌─────────────────────┐
│ IP Camera 2  │──▶│  Edge Server        │
└──────────────┘   │  (On-Premise/VPS)   │
                   │                     │
┌──────────────┐   │  - FFmpeg           │
│ IP Camera 3  │──▶│  - RTSP → HLS       │
└──────────────┘   │  - Nginx/Caddy      │
                   │  - Uploads to S3    │
                   └──────────┬──────────┘
                              │ HLS segments
                              ▼
                   ┌─────────────────────┐
                   │  Cloud Storage      │
                   │  (S3/GCS/Cloudflare)│
                   │  - .m3u8 playlists  │
                   │  - .ts segments     │
                   └──────────┬──────────┘
                              │ HTTPS
                              ▼
                   ┌─────────────────────┐
                   │  Frontend (Render)  │
                   │  - HLS.js player    │
                   │  - Reads from CDN   │
                   └─────────────────────┘
```

### **Implementation Steps**

#### Step 1: Setup Edge Server (On-Premise or VPS)
```bash
# Install FFmpeg
apt-get install ffmpeg nginx

# Create HLS conversion script
#!/bin/bash
# stream_to_hls.sh

RTSP_URL="rtsp://admin:password@192.168.1.100:554/stream"
OUTPUT_DIR="/var/www/hls/camera1"
S3_BUCKET="s3://franklin-streams/camera1"

mkdir -p $OUTPUT_DIR

# Convert RTSP to HLS
ffmpeg -i $RTSP_URL \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -c:a aac -b:a 128k \
  -f hls \
  -hls_time 2 \
  -hls_list_size 10 \
  -hls_flags delete_segments+append_list \
  -hls_segment_filename "$OUTPUT_DIR/segment_%03d.ts" \
  "$OUTPUT_DIR/stream.m3u8"

# Sync to S3 every 5 seconds
while true; do
  aws s3 sync $OUTPUT_DIR $S3_BUCKET --delete
  sleep 5
done
```

#### Step 2: Backend Endpoints (Node.js)
```javascript
// Backend: streaming.routes.js

router.get('/streams/:cameraId/stream.m3u8', async (req, res) => {
  const { cameraId } = req.params;
  
  // Option A: Proxy from S3
  const s3Url = `https://franklin-streams.s3.amazonaws.com/${cameraId}/stream.m3u8`;
  const response = await fetch(s3Url);
  const content = await response.text();
  
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(content);
});

router.get('/streams/:cameraId/:segment', async (req, res) => {
  const { cameraId, segment } = req.params;
  
  // Proxy .ts segments from S3
  const s3Url = `https://franklin-streams.s3.amazonaws.com/${cameraId}/${segment}`;
  const response = await fetch(s3Url);
  const buffer = await response.buffer();
  
  res.setHeader('Content-Type', 'video/mp2t');
  res.send(buffer);
});
```

#### Step 3: Frontend Player
```javascript
// Frontend: HlsPlayer.jsx
import Hls from 'hls.js';
import { useEffect, useRef } from 'react';
import { getStreamUrl } from '../../shared/config';

export default function HlsPlayer({ cameraId }) {
  const videoRef = useRef(null);
  
  useEffect(() => {
    const streamUrl = getStreamUrl(cameraId);
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS Error:', data);
          // Retry logic
          setTimeout(() => hls.loadSource(streamUrl), 5000);
        }
      });
      
      return () => hls.destroy();
    }
  }, [cameraId]);
  
  return <video ref={videoRef} controls autoPlay muted />;
}
```

### **Alternative: WebRTC (Lower Latency)**

For real-time streaming (<1s latency), use WebRTC:

```
Camera → Mediasoup Server → WebRTC → Frontend
```

**Mediasoup Setup:**
```javascript
// mediasoup-server.js (separate service)
const mediasoup = require('mediasoup');

// Create worker
const worker = await mediasoup.createWorker();

// Create router
const router = await worker.createRouter({
  mediaCodecs: [
    { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000 }
  ]
});

// Ingest RTSP via FFmpeg → RTP → Mediasoup
```

---

## 7. IMMEDIATE ACTION ITEMS

### Priority 1: Fix 500 Error
1. ✅ Deploy updated `app.py` with logging
2. ✅ Add `/debug/info` endpoint
3. ✅ Check Render logs for actual error
4. ✅ Upload model files to Render (use Option B: download from cloud)

### Priority 2: Fix Backend 404s
1. ✅ Update frontend to use `getApiUrl('/api/health/stats')`
2. ✅ Verify all backend routes have `/api` prefix
3. ✅ Test each endpoint individually

### Priority 3: CCTV Streaming
1. ⏳ Setup edge server with FFmpeg
2. ⏳ Configure S3/CloudFlare for HLS storage
3. ⏳ Update backend to proxy HLS from cloud storage
4. ⏳ Test HLS playback in frontend

---

## 8. TESTING CHECKLIST

```bash
# 1. Test AI Service Health
curl https://franklin-ai.onrender.com/health

# 2. Test Debug Info
curl https://franklin-ai.onrender.com/debug/info

# 3. Test Video Upload
curl -X POST https://franklin-ai.onrender.com/ai/unified/analyze \
  -F "file=@test.mp4" \
  -H "Content-Type: multipart/form-data"

# 4. Test Backend Health
curl https://franklin-backend-v0i3.onrender.com/health

# 5. Test Backend API Routes
curl https://franklin-backend-v0i3.onrender.com/api/health/stats

# 6. Test Stream (will 404 until CCTV setup complete)
curl https://franklin-backend-v0i3.onrender.com/streams/camera1/stream.m3u8
```

---

**🎯 Start with Priority 1 to fix the 500 error, then move to streaming setup!**
