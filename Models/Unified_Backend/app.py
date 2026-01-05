import os
import shutil
import uuid
import math
from typing import List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from ultralytics import YOLO
import cv2
import cv2
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Sources for models - ADJUST PATHS TO RELATIVE LOCATION IN THE WORKSPACE
SOURCE_TURTLE = os.path.abspath(os.path.join(BASE_DIR, "../Nest_Detection_Backend/models/best.pt"))
SOURCE_PREDATOR = os.path.abspath(os.path.join(BASE_DIR, "../Predator_Detection_Backend/models/best.pt"))
SOURCE_HUMAN = os.path.abspath(os.path.join(BASE_DIR, "../Human_Detection_Backend/models/yolov8n.pt"))

models = {}

def ensure_models():
    # Copy models if not present
    dest_turtle = os.path.join(MODELS_DIR, "turtle.pt")
    dest_predator = os.path.join(MODELS_DIR, "predator.pt")
    dest_human = os.path.join(MODELS_DIR, "human.pt")
    
    if not os.path.exists(dest_turtle) and os.path.exists(SOURCE_TURTLE):
        print(f"Copying turtle model from {SOURCE_TURTLE}")
        shutil.copy(SOURCE_TURTLE, dest_turtle)
    
    if not os.path.exists(dest_predator) and os.path.exists(SOURCE_PREDATOR):
        print(f"Copying predator model from {SOURCE_PREDATOR}")
        shutil.copy(SOURCE_PREDATOR, dest_predator)
        
    if not os.path.exists(dest_human) and os.path.exists(SOURCE_HUMAN):
        print(f"Copying human model from {SOURCE_HUMAN}")
        shutil.copy(SOURCE_HUMAN, dest_human)

def get_model(key):
    if key not in models:
        path = os.path.join(MODELS_DIR, f"{key}.pt")
        if os.path.exists(path):
            try:
                print(f"Loading {key} model...")
                models[key] = YOLO(path)
            except Exception as e:
                print(f"Error loading {key}: {e}")
                return None
        else:
            return None
    return models[key]

# Initialize
try:
    ensure_models()
except Exception as e:
    print(f"Setup error: {e}")


@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    ensure_models()
    
    video_id = uuid.uuid4().hex
    # Use standard naming
    video_filename = f"{video_id}.mp4"
    video_path = os.path.join(OUTPUT_DIR, video_filename)
    
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Cannot read video")
        
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    results = []
    
    # Track stationary objects for nest detection
    # Format: { 'id': [x, y, first_seen_time, last_seen_time, count] }
    STATIONARY_THRESHOLD = 2.0 # seconds to be considered a nest
    MOVEMENT_THRESHOLD = 5.0 # percentage of map movement allowed
    
    # Temporal Tracking for Nest Detection
    # Format: { track_id: { 'first_time': t, 'last_pos': (x,y), 'type': 'turtle', 'is_nest': False } }
    turtle_tracks = [] 
    NEST_TIME_THRESHOLD = 3600.0 # seconds
    NEST_MOVEMENT_LIMIT = 10.0 # pixels/units on map (0-100 scale)
    step = 5

    count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        if count % step == 0:
            timestamp = count / fps
            frame_dets = []
            
            # 1. Turtle Detection
            model_t = get_model('turtle')
            if model_t:
                res = model_t(frame, verbose=False, conf=0.5)
                for r in res:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        cx, by = (x1 + x2) / 2, y2
                        mx, my = (cx / width) * 100, (by / height) * 100
                        frame_dets.append({
                            "type": "turtle",
                            "score": float(box.conf[0]),
                            "bbox": [x1, y1, x2, y2],
                            "map_x": mx,
                            "map_y": my
                        })

            # 2. Predator Detection
            model_p = get_model('predator')
            if model_p:
                res = model_p(frame, verbose=False, conf=0.5)
                for r in res:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        cx, by = (x1 + x2) / 2, y2
                        frame_dets.append({
                            "type": "predator",
                            "score": float(box.conf[0]),
                            "bbox": [x1, y1, x2, y2],
                            "map_x": (cx / width) * 100,
                            "map_y": (by / height) * 100
                        })

            # 3. Human Detection
            model_h = get_model('human')
            if model_h:
                res = model_h(frame, verbose=False, conf=0.5, classes=[0])
                for r in res:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        cx, by = (x1 + x2) / 2, y2
                        frame_dets.append({
                            "type": "human",
                            "score": float(box.conf[0]),
                            "bbox": [x1, y1, x2, y2],
                            "map_x": (cx / width) * 100,
                            "map_y": (by / height) * 100
                        })
            
            # Non-Maximum Suppression (NMS)
            def calculate_iou(box1, box2):
                x1, y1, x2, y2 = max(box1[0], box2[0]), max(box1[1], box2[1]), min(box1[2], box2[2]), min(box1[3], box2[3])
                inter = max(0, x2 - x1) * max(0, y2 - y1)
                area1, area2 = (box1[2]-box1[0])*(box1[3]-box1[1]), (box2[2]-box2[0])*(box2[3]-box2[1])
                union = area1 + area2 - inter
                return inter / union if union > 0 else 0

            final_dets = []
            frame_dets.sort(key=lambda x: x['score'], reverse=True)
            for det in frame_dets:
                if not any(calculate_iou(det['bbox'], other['bbox']) > 0.5 for other in final_dets):
                    final_dets.append(det)

            # --- Nest Logic: Track Turtles Over Time ---
            current_turtles = [d for d in final_dets if d['type'] == 'turtle']
            for t_det in current_turtles:
                matched = False
                for track in turtle_tracks:
                    # Check distance from last known position
                    dist = math.sqrt((t_det['map_x'] - track['last_pos'][0])**2 + (t_det['map_y'] - track['last_pos'][1])**2)
                    if dist < 12.0: # Match if within 12 units
                        track['last_pos'] = (t_det['map_x'], t_det['map_y'])
                        track['last_seen'] = timestamp
                        # Check if stationary for > 1 second (as per user's latest change)
                        duration = track['last_seen'] - track['first_seen']
                        move_from_start = math.sqrt((t_det['map_x'] - track['start_pos'][0])**2 + (t_det['map_y'] - track['start_pos'][1])**2)
                        
                        if duration >= NEST_TIME_THRESHOLD and move_from_start <= NEST_MOVEMENT_LIMIT:
                            track['is_nest'] = True
                        elif move_from_start > NEST_MOVEMENT_LIMIT:
                            # If it moves too much, it's just a turtle again for THIS track
                            track['is_nest'] = False
                        
                        if track['is_nest']:
                            t_det['type'] = 'nest'
                            t_det['hasNest'] = True
                        else:
                            t_det['type'] = 'turtle'
                            t_det['hasNest'] = False
                        
                        matched = True
                        break
                
                if not matched:
                    # Start new track
                    turtle_tracks.append({
                        'start_pos': (t_det['map_x'], t_det['map_y']),
                        'last_pos': (t_det['map_x'], t_det['map_y']),
                        'first_seen': timestamp,
                        'last_seen': timestamp,
                        'is_nest': False
                    })

            # Cleanup old tracks (not seen for 2 seconds)
            turtle_tracks = [t for t in turtle_tracks if timestamp - t['last_seen'] < 2.0]

            # Spatial Metadata
            cam_x, cam_y = 50.0, 100.0
            for d in final_dets:
                dx, dy = d['map_x'] - cam_x, d['map_y'] - cam_y
                dist = math.sqrt(dx**2 + dy**2)
                d['distance_m'] = round((dist / 100.0) * 15.0, 2)
                d['bearing_deg'] = round(math.degrees(math.atan2(dx, -dy)), 1)

            results.append({
                "time": timestamp,
                "entities": final_dets
            })
            
        count += 1
        
    cap.release()
    
    return {
        "video_url": f"http://localhost:8000/content/{video_filename}",
        "duration": total_frames / fps,
        "data": results
    }

@app.get("/content/{filename}")
async def get_content(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
