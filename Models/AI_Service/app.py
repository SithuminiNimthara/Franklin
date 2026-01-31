import os
import shutil
import uuid
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Dict, Any

# Local Modules
from models.unified import UnifiedProcessor
from models.disease import DiseaseClassifier
from models.shoreline import ShorelineModel, ShorelineSettings
from models.hatchery import HatcheryEngine

app = FastAPI(title="Franklin AI Service (Merged)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models_data") # Store weights here
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

NODE_BACKEND_URL = os.environ.get("NODE_BACKEND_URL") # Provided by Render manually
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL") # Self URL

# Map existing model paths or download logic
# In merged repo on Render, we assume models are in MODELS_DIR or we configure paths.
MODEL_PATHS = {
    "unified_turtle": os.path.join(MODELS_DIR, "unified_turtle.pt"),
    "unified_predator": os.path.join(MODELS_DIR, "unified_predator.pt"),
    "disease": os.path.join(MODELS_DIR, "disease_encoder.keras"),
    "disease_support": os.path.join(MODELS_DIR, "disease_support"),
    "shoreline": os.path.join(MODELS_DIR, "shoreline_seg.pt"),
    "hatchery": os.path.join(MODELS_DIR, "hatchery_best.pt")
}

# --- Service Instances ---
# We initialize lazily or on startup. Ideally global singletons.
unified_processor = None
disease_classifier = None
shoreline_model = None
hatchery_engine = None

@app.on_event("startup")
async def startup_event():
    global unified_processor, disease_classifier, shoreline_model, hatchery_engine
    print("Starting Franklin AI Service...")
    
    # 1. Unified
    unified_processor = UnifiedProcessor(MODELS_DIR, NODE_BACKEND_URL)
    
    # 2. Disease
    # Only init if model exists, or it handles its own fallback
    disease_classifier = DiseaseClassifier(MODEL_PATHS["disease"], MODEL_PATHS["disease_support"])
    
    # 3. Shoreline
    # Shoreline needs a specific settings object
    try:
        if os.path.exists(MODEL_PATHS["shoreline"]):
            settings = ShorelineSettings(model_path=MODEL_PATHS["shoreline"])
            shoreline_model = ShorelineModel(settings)
            print("Shoreline model loaded.")
        else:
            print("Shoreline model not found, skipping.")
    except Exception as e:
        print(f"Shoreline init error: {e}")

    # 4. Hatchery
    # Uses YOLO
    try:
        hatchery_engine = HatcheryEngine(MODEL_PATHS["hatchery"], NODE_BACKEND_URL)
        print("Hatchery engine loaded.")
    except Exception as e:
        print(f"Hatchery init error: {e}")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Franklin AI Combined",
        "models": {
            "unified": unified_processor is not None,
            "disease": disease_classifier is not None,
            "shoreline": shoreline_model is not None,
            "hatchery": hatchery_engine is not None
        }
    }

# --- UNIFIED ENDPOINTS ---
@app.post("/ai/unified/analyze")
async def analyze_unified(file: UploadFile = File(...)):
    if not unified_processor:
        raise HTTPException(503, "Unified processor not initialized")
    
    vid_id = uuid.uuid4().hex
    filename = f"{vid_id}.mp4"
    path = os.path.join(OUTPUT_DIR, filename)
    
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    try:
        result = unified_processor.process_video(path, filename)
        result["video_url"] = f"{AI_SERVICE_URL}/content/{filename}" if AI_SERVICE_URL else f"/content/{filename}"
        return result
    except Exception as e:
        raise HTTPException(500, str(e))

# --- DISEASE ENDPOINTS ---
@app.post("/ai/disease/classify")
async def classify_disease(file: UploadFile = File(...)):
    if not disease_classifier:
        raise HTTPException(503, "Disease classifier not initialized")
    
    content = await file.read()
    return disease_classifier.classify(content)

# --- SHORELINE ENDPOINTS ---
@app.post("/ai/shoreline/predict")
async def predict_shoreline(file: UploadFile = File(...)):
    if not shoreline_model:
        raise HTTPException(503, "Shoreline model not initialized")
        
    content = await file.read()
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Invalid image")
        
    pts, conf, mask_b64 = shoreline_model.predict(img)
    
    # Compute risk manually here if needed or move logic to model
    h = img.shape[0]
    risk_level = "low"
    notes = ["Shoreline detected."]
    if pts:
        ys = [p["y"] for p in pts]
        avg = np.mean(ys)
        if avg < h * 0.35: risk_level = "high"
        elif avg < h * 0.55: risk_level = "medium"
        
    return {
        "shoreline_points": pts,
        "shoreline_conf": conf,
        "risk_level": risk_level,
        "notes": notes,
        "mask_png_b64": mask_b64,
        "image": {"w": img.shape[1], "h": img.shape[0]}
    }

# --- HATCHERY ENDPOINTS ---
@app.post("/ai/hatchery/register_upload")
async def register_hatchery(request: Request):
    if not hatchery_engine:
        raise HTTPException(503, "Hatchery engine not initialized")
    
    data = await request.json()
    vid_id = data.get("videoId")
    vid_path = data.get("videoPath")
    
    if hatchery_engine.register_video(vid_id, vid_path):
        return {"status": "registered", "videoId": vid_id}
    else:
        raise HTTPException(500, "Failed to register video")

@app.get("/ai/hatchery/stream/{video_id}")
def stream_hatchery(video_id: str):
    if not hatchery_engine:
        raise HTTPException(503, "Hatchery engine not initialized")
    
    # This needs to yield a generator. 
    # Flask Response vs FastAPI StreamingResponse
    from fastapi.responses import StreamingResponse
    
    def iter_frames():
        # Adapting the generator from hatchery.py which was originally built for Flask
        # We need to ensure generate_frames is compatible or migrated fully
        # For now, let's assume we copy logic or import it.
        # But hatchery.py provided earlier didn't have generate_frames, it had process_frame.
        # We need to construct a loop here or in the engine.
        
        # NOTE: Real-time streaming on Render Free tier might be slow/timeout.
        # But for compliance we implement it.
        
        # Re-implement simple loop using HatcheryEngine's process_frame
        path = hatchery_engine.video_sources.get(video_id)
        if not path: return
        
        # If path is HTTP, open it
        cap = cv2.VideoCapture(path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
                
            frame = hatchery_engine.process_frame(frame, video_id, fps)
            
            _, buf = cv2.imencode(".jpg", frame)
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")
            
            # Simple throttle
            # time.sleep(1/fps) # In async fastAPI this might block event loop if not careful
            # But StreamingResponse runs in a separate thread usually.
            
        cap.release()

    return StreamingResponse(iter_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/ai/hatchery/data/{video_id}")
def data_hatchery(video_id: str):
    if not hatchery_engine: raise HTTPException(503, "Hatchery engine not initialized")
    s = hatchery_engine.states.get(video_id, {"status": "Offline", "health": "Unknown", "species": "Unknown"})
    return s

@app.get("/content/{filename}")
async def get_content(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(404)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
